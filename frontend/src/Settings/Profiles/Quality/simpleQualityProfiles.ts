import {
  QualityProfileItems,
  QualityProfileModel,
  QualityProfileQualityItem,
} from './useQualityProfiles';

export type SimpleQualityProfileResolution = 720 | 1080 | 2160;

export const simpleQualityProfileOptions: {
  key: SimpleQualityProfileResolution;
  value: string;
}[] = [
  { key: 720, value: '720p' },
  { key: 1080, value: '1080p' },
  { key: 2160, value: '4K' },
];

const qualityIdsByResolution: Record<SimpleQualityProfileResolution, number[]> =
  {
    720: [4, 14, 5, 6],
    1080: [9, 10, 15, 3, 7, 20],
    2160: [16, 17, 18, 19, 21],
  };

const defaultCutoffByResolution: Record<SimpleQualityProfileResolution, number> =
  {
    720: 4,
    1080: 9,
    2160: 16,
  };

export function getSimpleQualityProfileName(
  resolution: SimpleQualityProfileResolution
) {
  return resolution === 2160 ? '4K' : `${resolution}p`;
}

function qualityItemResolution(item: QualityProfileQualityItem) {
  if (qualityIdsByResolution[720].includes(item.quality.id)) {
    return 720;
  }

  if (qualityIdsByResolution[1080].includes(item.quality.id)) {
    return 1080;
  }

  if (qualityIdsByResolution[2160].includes(item.quality.id)) {
    return 2160;
  }

  return null;
}

function getProfileResolutions(items: QualityProfileItems = []) {
  return items.reduce<Set<SimpleQualityProfileResolution>>((acc, item) => {
    if ('quality' in item) {
      const resolution = qualityItemResolution(item);

      if (item.allowed && resolution) {
        acc.add(resolution);
      }

      return acc;
    }

    item.items.forEach((groupItem) => {
      const resolution = qualityItemResolution(groupItem);

      if (item.allowed && resolution) {
        acc.add(resolution);
      }
    });

    return acc;
  }, new Set<SimpleQualityProfileResolution>());
}

export function getSimpleQualityProfileResolution(profile: QualityProfileModel) {
  const normalizedName = profile.name.toLowerCase();

  if (normalizedName.includes('4k') || normalizedName.includes('2160')) {
    return 2160;
  }

  if (normalizedName.includes('1080')) {
    return 1080;
  }

  if (normalizedName.includes('720')) {
    return 720;
  }

  const resolutions = Array.from(getProfileResolutions(profile.items));

  if (resolutions.length === 1) {
    return resolutions[0];
  }

  return resolutions.sort((a, b) => b - a)[0] ?? 1080;
}

export function getSimpleQualityProfileLabels(profile: QualityProfileModel) {
  const resolutions = Array.from(getProfileResolutions(profile.items)).sort(
    (a, b) => a - b
  );

  if (resolutions.length === 0) {
    return [
      getSimpleQualityProfileName(getSimpleQualityProfileResolution(profile)),
    ];
  }

  return resolutions.map(getSimpleQualityProfileName);
}

export function normalizeQualityProfile(
  profile: QualityProfileModel,
  resolution: SimpleQualityProfileResolution
): QualityProfileModel {
  const allowedQualityIds = new Set(qualityIdsByResolution[resolution]);

  const items = profile.items.map((item) => {
    if ('quality' in item) {
      return {
        ...item,
        allowed: allowedQualityIds.has(item.quality.id),
        minSize: null,
        maxSize: null,
        preferredSize: null,
      };
    }

    const groupAllowed = item.items.some((groupItem) =>
      allowedQualityIds.has(groupItem.quality.id)
    );

    return {
      ...item,
      allowed: groupAllowed,
      items: item.items.map((groupItem) => ({
        ...groupItem,
        allowed: groupAllowed,
        minSize: null,
        maxSize: null,
        preferredSize: null,
      })),
    };
  });

  return {
    ...profile,
    name: profile.name || getSimpleQualityProfileName(resolution),
    upgradeAllowed: false,
    cutoff: defaultCutoffByResolution[resolution],
    items,
    minFormatScore: 0,
    cutoffFormatScore: 0,
    minUpgradeFormatScore: 1,
    formatItems: profile.formatItems.map((item) => ({
      ...item,
      score: 0,
    })),
  };
}
