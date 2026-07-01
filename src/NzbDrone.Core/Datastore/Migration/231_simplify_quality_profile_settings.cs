using System.Collections.Generic;
using System.Data;
using Dapper;
using FluentMigrator;
using Newtonsoft.Json.Linq;
using NzbDrone.Common.Serializer;
using NzbDrone.Core.Datastore.Migration.Framework;

namespace NzbDrone.Core.Datastore.Migration
{
    [Migration(231)]
    public class simplify_quality_profile_settings : NzbDroneMigrationBase
    {
        protected override void MainDbUpgrade()
        {
            Execute.WithConnection(SimplifyProfiles);
        }

        private void SimplifyProfiles(IDbConnection conn, IDbTransaction tran)
        {
            var profiles = new List<QualityProfile231>();

            using (var getProfilesCmd = conn.CreateCommand())
            {
                getProfilesCmd.Transaction = tran;
                getProfilesCmd.CommandText = "SELECT \"Id\", \"Items\", \"FormatItems\" FROM \"QualityProfiles\"";

                using (var reader = getProfilesCmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        profiles.Add(new QualityProfile231
                        {
                            Id = reader.GetInt32(0),
                            Items = Json.Deserialize<List<QualityProfileItem231>>(reader.GetString(1)),
                            FormatItems = reader.GetString(2)
                        });
                    }
                }
            }

            foreach (var profile in profiles)
            {
                ClearSizes(profile.Items);
                profile.FormatItems = ClearFormatScores(profile.FormatItems);
            }

            const string updateSql = "UPDATE \"QualityProfiles\" " +
                                     "SET \"UpgradeAllowed\" = @UpgradeAllowed, " +
                                     "\"MinFormatScore\" = @MinFormatScore, " +
                                     "\"CutoffFormatScore\" = @CutoffFormatScore, " +
                                     "\"MinUpgradeFormatScore\" = @MinUpgradeFormatScore, " +
                                     "\"Items\" = @Items, " +
                                     "\"FormatItems\" = @FormatItems " +
                                     "WHERE \"Id\" = @Id";

            conn.Execute(updateSql, profiles.ConvertAll(p => new
            {
                p.Id,
                UpgradeAllowed = false,
                MinFormatScore = 0,
                CutoffFormatScore = 0,
                MinUpgradeFormatScore = 1,
                Items = p.Items.ToJson(),
                p.FormatItems
            }), transaction: tran);
        }

        private static void ClearSizes(List<QualityProfileItem231> items)
        {
            foreach (var item in items)
            {
                item.MinSize = null;
                item.MaxSize = null;
                item.PreferredSize = null;

                if (item.Items != null)
                {
                    ClearSizes(item.Items);
                }
            }
        }

        private static string ClearFormatScores(string formatItems)
        {
            var items = JArray.Parse(formatItems);

            foreach (var item in items)
            {
                if (item["Score"] != null)
                {
                    item["Score"] = 0;
                }
                else if (item["score"] != null)
                {
                    item["score"] = 0;
                }
                else
                {
                    item["Score"] = 0;
                }
            }

            return items.ToString(Newtonsoft.Json.Formatting.None);
        }

        private class QualityProfile231
        {
            public int Id { get; set; }
            public List<QualityProfileItem231> Items { get; set; }
            public string FormatItems { get; set; }
        }

        private class QualityProfileItem231
        {
            public int Id { get; set; }
            public string Name { get; set; }
            public int? Quality { get; set; }
            public List<QualityProfileItem231> Items { get; set; }
            public bool Allowed { get; set; }
            public double? MinSize { get; set; }
            public double? MaxSize { get; set; }
            public double? PreferredSize { get; set; }
        }
    }
}
