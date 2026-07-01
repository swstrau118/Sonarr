import React, { useCallback, useState } from 'react';
import Card from 'Components/Card';
import Label from 'Components/Label';
import IconButton from 'Components/Link/IconButton';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import EditQualityProfileModal from './EditQualityProfileModal';
import { getSimpleQualityProfileLabels } from './simpleQualityProfiles';
import {
  QualityProfileModel,
  useDeleteQualityProfile,
} from './useQualityProfiles';
import styles from './QualityProfile.css';

interface QualityProfileProps extends QualityProfileModel {
  isDeleting: boolean;
  onCloneQualityProfilePress: (id: number) => void;
}

function QualityProfile({
  id,
  name,
  items,
  isDeleting,
  onCloneQualityProfilePress,
  ...profile
}: QualityProfileProps) {
  const { deleteQualityProfile } = useDeleteQualityProfile(id);
  const labels = getSimpleQualityProfileLabels({
    id,
    name,
    items,
    ...profile,
  });

  const [isEditQualityProfileModalOpen, setIsEditQualityProfileModalOpen] =
    useState(false);

  const [isDeleteQualityProfileModalOpen, setIsDeleteQualityProfileModalOpen] =
    useState(false);

  const handleEditQualityProfilePress = useCallback(() => {
    setIsEditQualityProfileModalOpen(true);
  }, []);

  const handleEditQualityProfileModalClose = useCallback(() => {
    setIsEditQualityProfileModalOpen(false);
  }, []);

  const handleDeleteQualityProfilePress = useCallback(() => {
    setIsDeleteQualityProfileModalOpen(true);
  }, []);

  const handleDeleteQualityProfileModalClose = useCallback(() => {
    setIsDeleteQualityProfileModalOpen(false);
  }, []);

  const handleConfirmDeleteQualityProfile = useCallback(() => {
    deleteQualityProfile();
  }, [deleteQualityProfile]);

  const handleCloneQualityProfilePress = useCallback(() => {
    onCloneQualityProfilePress(id);
  }, [id, onCloneQualityProfilePress]);

  return (
    <Card
      className={styles.qualityProfile}
      overlayContent={true}
      onPress={handleEditQualityProfilePress}
    >
      <div className={styles.nameContainer}>
        <div className={styles.name}>{name}</div>

        <IconButton
          className={styles.cloneButton}
          title={translate('CloneProfile')}
          aria-label={translate('CloneProfile')}
          name={icons.CLONE}
          onPress={handleCloneQualityProfilePress}
        />
      </div>

      <div className={styles.qualities}>
        {labels.map((label) => {
          return (
            <Label key={label} kind={kinds.INFO}>
              {label}
            </Label>
          );
        })}
      </div>

      <EditQualityProfileModal
        id={id}
        isOpen={isEditQualityProfileModalOpen}
        onModalClose={handleEditQualityProfileModalClose}
        onDeleteQualityProfilePress={handleDeleteQualityProfilePress}
      />

      <ConfirmModal
        isOpen={isDeleteQualityProfileModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteQualityProfile')}
        message={translate('DeleteQualityProfileMessageText', { name })}
        confirmLabel={translate('Delete')}
        isSpinning={isDeleting}
        onConfirm={handleConfirmDeleteQualityProfile}
        onCancel={handleDeleteQualityProfileModalClose}
      />
    </Card>
  );
}

export default QualityProfile;
