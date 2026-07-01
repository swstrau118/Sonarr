import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import Popover from 'Components/Tooltip/Popover';
import { icons, inputTypes, kinds } from 'Helpers/Props';
import { useSaveProviderSettings } from 'Settings/useProviderSettings';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import {
  getSimpleQualityProfileName,
  getSimpleQualityProfileResolution,
  normalizeQualityProfile,
  SimpleQualityProfileResolution,
  simpleQualityProfileOptions,
} from './simpleQualityProfiles';
import useQualityProfileInUse from './useQualityProfileInUse';
import {
  QualityProfileModel,
  useQualityProfile,
  useQualityProfileSchema,
} from './useQualityProfiles';
import styles from './EditQualityProfileModalContent.css';

const QUALITY_PROFILE_PATH = '/qualityprofile';

interface EditQualityProfileModalContentProps {
  id?: number;
  cloneId?: number;
  onContentHeightChange: (height: number) => void;
  onDeleteQualityProfilePress?: () => void;
  onModalClose: () => void;
}

function getInitialProfile(
  profile: QualityProfileModel,
  id: number | undefined,
  cloneId: number | undefined
) {
  if (cloneId) {
    return {
      ...profile,
      id: 0,
      name: translate('DefaultNameCopiedProfile', {
        name: profile.name,
      }),
    };
  }

  if (!id) {
    const resolution = getSimpleQualityProfileResolution(profile);

    return {
      ...profile,
      name: profile.name || getSimpleQualityProfileName(resolution),
    };
  }

  return profile;
}

function EditQualityProfileModalContent({
  id,
  cloneId,
  onDeleteQualityProfilePress,
  onModalClose,
}: EditQualityProfileModalContentProps) {
  const profile = useQualityProfile(id);
  const cloneProfile = useQualityProfile(cloneId);
  const { schema, isSchemaLoading, isSchemaFetched, schemaError } =
    useQualityProfileSchema(!id && !cloneId);

  const sourceProfile = id ? profile : cloneId ? cloneProfile : schema;

  const initialProfile = useMemo(() => {
    if (!sourceProfile?.items) {
      return undefined;
    }

    return getInitialProfile(sourceProfile, id, cloneId);
  }, [cloneId, id, sourceProfile]);

  const [name, setName] = useState('');
  const [resolution, setResolution] =
    useState<SimpleQualityProfileResolution>(1080);

  useEffect(() => {
    if (!initialProfile) {
      return;
    }

    const initialResolution = getSimpleQualityProfileResolution(initialProfile);

    setName(
      initialProfile.name || getSimpleQualityProfileName(initialResolution)
    );
    setResolution(initialResolution);
  }, [initialProfile]);

  const { seriesCount, importListCount } = useQualityProfileInUse(id);
  const isInUse = seriesCount !== 0 || importListCount !== 0;

  const handleSaveSuccess = useCallback(() => {
    onModalClose();
  }, [onModalClose]);

  const { save, isSaving, saveError } =
    useSaveProviderSettings<QualityProfileModel>(
      initialProfile?.id ?? 0,
      QUALITY_PROFILE_PATH,
      handleSaveSuccess
    );

  const handleNameChange = useCallback(({ value }: InputChanged<string>) => {
    setName(value);
  }, []);

  const handleResolutionChange = useCallback(
    ({ value }: InputChanged<SimpleQualityProfileResolution>) => {
      setResolution(value);
    },
    []
  );

  const handleSavePress = useCallback(() => {
    if (!initialProfile) {
      return;
    }

    save(
      normalizeQualityProfile(
        {
          ...initialProfile,
          name: name.trim() || getSimpleQualityProfileName(resolution),
        },
        resolution
      )
    );
  }, [initialProfile, name, resolution, save]);

  const isLoading = Boolean(id || cloneId)
    ? !initialProfile
    : isSchemaLoading || !isSchemaFetched;

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {id ? translate('EditQualityProfile') : translate('AddQualityProfile')}
      </ModalHeader>

      <ModalBody>
        {schemaError ? (
          <div>{translate('QualityProfilesLoadError')}</div>
        ) : isLoading ? (
          <LoadingIndicator />
        ) : (
          <Form>
            <div className={styles.simpleForm}>
              <FormGroup>
                <FormLabel>{translate('Name')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.TEXT}
                  name="name"
                  value={name}
                  onChange={handleNameChange}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>{translate('Quality')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.SELECT}
                  name="resolution"
                  value={resolution}
                  values={simpleQualityProfileOptions}
                  onChange={handleResolutionChange}
                />
              </FormGroup>
            </div>
          </Form>
        )}
      </ModalBody>

      <ModalFooter>
        {id ? (
          <div
            className={styles.deleteButtonContainer}
            title={
              isInUse
                ? translate('QualityProfileInUseSeriesListCollection')
                : undefined
            }
          >
            <Button
              kind={kinds.DANGER}
              isDisabled={isInUse}
              onPress={onDeleteQualityProfilePress}
            >
              {translate('Delete')}
            </Button>

            {isInUse ? (
              <Popover
                title={translate('QualityProfileUsage')}
                body={
                  <div>
                    {seriesCount ? (
                      <div>
                        {translate('QualityProfileUsedInCountSeries', {
                          count: seriesCount,
                        })}
                      </div>
                    ) : null}
                    {importListCount ? (
                      <div>
                        {translate('QualityProfileUsedInCountImportLists', {
                          count: importListCount,
                        })}
                      </div>
                    ) : null}
                  </div>
                }
                anchor={
                  <Icon
                    className={styles.deleteButtonInfoIcon}
                    name={icons.INFO}
                  />
                }
              />
            ) : null}
          </div>
        ) : null}

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          isSpinning={isSaving}
          error={saveError}
          isDisabled={!initialProfile}
          onPress={handleSavePress}
        >
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default EditQualityProfileModalContent;
