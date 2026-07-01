using System;
using System.Collections.Generic;
using System.Linq;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.Indexers;
using NzbDrone.Core.Parser.Model;
using NzbDrone.Core.Profiles.Delay;
using NzbDrone.Core.Tv;

namespace NzbDrone.Core.DecisionEngine
{
    public class DownloadDecisionComparer : IComparer<DownloadDecision>
    {
        private readonly IConfigService _configService;
        private readonly IDelayProfileService _delayProfileService;

        public delegate int CompareDelegate(DownloadDecision x, DownloadDecision y);
        public delegate int CompareDelegate<TSubject, TValue>(DownloadDecision x, DownloadDecision y);

        public DownloadDecisionComparer(IConfigService configService, IDelayProfileService delayProfileService)
        {
            _configService = configService;
            _delayProfileService = delayProfileService;
        }

        public int Compare(DownloadDecision x, DownloadDecision y)
        {
            var comparers = new List<CompareDelegate>
            {
                CompareQuality,
                CompareEpisodeCount,
                CompareEpisodeNumber,
                CompareTorrentSeederAvailability,
                CompareSize,
                ComparePeersIfTorrent,
                CompareCustomFormatScore,
                CompareProtocol,
                CompareIndexerPriority,
                CompareAgeIfUsenet,
            };

            return comparers.Select(comparer => comparer(x, y)).FirstOrDefault(result => result != 0);
        }

        private int CompareBy<TSubject, TValue>(TSubject left, TSubject right, Func<TSubject, TValue> funcValue)
            where TValue : IComparable<TValue>
        {
            var leftValue = funcValue(left);
            var rightValue = funcValue(right);

            return leftValue.CompareTo(rightValue);
        }

        private int CompareByReverse<TSubject, TValue>(TSubject left, TSubject right, Func<TSubject, TValue> funcValue)
            where TValue : IComparable<TValue>
        {
            return CompareBy(left, right, funcValue) * -1;
        }

        private int CompareAll(params int[] comparers)
        {
            return comparers.Select(comparer => comparer).FirstOrDefault(result => result != 0);
        }

        private int CompareIndexerPriority(DownloadDecision x, DownloadDecision y)
        {
            return CompareByReverse(x.RemoteEpisode.Release, y.RemoteEpisode.Release, release => release.IndexerPriority);
        }

        private int CompareQuality(DownloadDecision x, DownloadDecision y)
        {
            if (_configService.DownloadPropersAndRepacks == ProperDownloadTypes.DoNotPrefer)
            {
                return CompareBy(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode => remoteEpisode.ParsedEpisodeInfo.Quality.Quality.Resolution);
            }

            return CompareAll(
                CompareBy(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode => remoteEpisode.ParsedEpisodeInfo.Quality.Quality.Resolution),
                CompareBy(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode => remoteEpisode.ParsedEpisodeInfo.Quality.Revision));
        }

        private int CompareCustomFormatScore(DownloadDecision x, DownloadDecision y)
        {
            return CompareBy(x.RemoteEpisode, y.RemoteEpisode, remoteMovie => remoteMovie.CustomFormatScore);
        }

        private int CompareProtocol(DownloadDecision x, DownloadDecision y)
        {
            var result = CompareBy(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode =>
            {
                var delayProfile = _delayProfileService.BestForTags(remoteEpisode.Series.Tags);
                var downloadProtocol = remoteEpisode.Release.DownloadProtocol;
                return downloadProtocol == delayProfile.PreferredProtocol;
            });

            return result;
        }

        private int CompareEpisodeCount(DownloadDecision x, DownloadDecision y)
        {
            var seasonPackCompare = CompareBy(x.RemoteEpisode,
                y.RemoteEpisode,
                remoteEpisode => remoteEpisode.ParsedEpisodeInfo.FullSeason);

            if (seasonPackCompare != 0)
            {
                return seasonPackCompare;
            }

            if (x.RemoteEpisode.Series.SeriesType == SeriesTypes.Anime &
                y.RemoteEpisode.Series.SeriesType == SeriesTypes.Anime)
            {
                return CompareBy(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode => remoteEpisode.Episodes.Count);
            }

            return CompareByReverse(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode => remoteEpisode.Episodes.Count);
        }

        private int CompareEpisodeNumber(DownloadDecision x, DownloadDecision y)
        {
            return CompareByReverse(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode => remoteEpisode.Episodes.Select(e => e.EpisodeNumber).MinOrDefault());
        }

        private int CompareTorrentSeederAvailability(DownloadDecision x, DownloadDecision y)
        {
            if (x.RemoteEpisode.Release.DownloadProtocol != DownloadProtocol.Torrent ||
                y.RemoteEpisode.Release.DownloadProtocol != DownloadProtocol.Torrent)
            {
                return 0;
            }

            return CompareBy(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode =>
            {
                var seeders = TorrentInfo.GetSeeders(remoteEpisode.Release);

                if (!seeders.HasValue)
                {
                    return 1;
                }

                return seeders.Value > 0 ? 2 : 0;
            });
        }

        private int ComparePeersIfTorrent(DownloadDecision x, DownloadDecision y)
        {
            if (x.RemoteEpisode.Release.DownloadProtocol != DownloadProtocol.Torrent ||
                y.RemoteEpisode.Release.DownloadProtocol != DownloadProtocol.Torrent)
            {
                return 0;
            }

            return CompareAll(
                CompareBy(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode => TorrentInfo.GetSeeders(remoteEpisode.Release) ?? 0),
                CompareBy(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode => TorrentInfo.GetPeers(remoteEpisode.Release) ?? 0));
        }

        private int CompareAgeIfUsenet(DownloadDecision x, DownloadDecision y)
        {
            if (x.RemoteEpisode.Release.DownloadProtocol != DownloadProtocol.Usenet ||
                y.RemoteEpisode.Release.DownloadProtocol != DownloadProtocol.Usenet)
            {
                return 0;
            }

            return CompareBy(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode =>
            {
                var ageHours = remoteEpisode.Release.AgeHours;
                var age = remoteEpisode.Release.Age;

                if (ageHours < 1)
                {
                    return 1000;
                }

                if (ageHours <= 24)
                {
                    return 100;
                }

                if (age <= 7)
                {
                    return 10;
                }

                return Math.Round(Math.Log10(age)) * -1;
            });
        }

        private int CompareSize(DownloadDecision x, DownloadDecision y)
        {
            return CompareBy(x.RemoteEpisode, y.RemoteEpisode, remoteEpisode =>
            {
                var size = remoteEpisode.Release.Size.Round(200.Megabytes());

                return size > 0 ? size * -1 : long.MinValue;
            });
        }
    }
}
