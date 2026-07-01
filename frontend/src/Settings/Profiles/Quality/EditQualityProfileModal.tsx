import React from 'react';
import Modal from 'Components/Modal/Modal';
import { sizes } from 'Helpers/Props';
import EditQualityProfileModalContent from './EditQualityProfileModalContent';

interface EditQualityProfileModalProps {
  id?: number;
  cloneId?: number;
  isOpen: boolean;
  onDeleteQualityProfilePress?: () => void;
  onModalClose: () => void;
}

function EditQualityProfileModal({
  id,
  cloneId,
  isOpen,
  onDeleteQualityProfilePress,
  onModalClose,
}: EditQualityProfileModalProps) {
  return (
    <Modal isOpen={isOpen} size={sizes.MEDIUM} onModalClose={onModalClose}>
      <EditQualityProfileModalContent
        id={id}
        cloneId={cloneId}
        onContentHeightChange={() => undefined}
        onDeleteQualityProfilePress={onDeleteQualityProfilePress}
        onModalClose={onModalClose}
      />
    </Modal>
  );
}

export default EditQualityProfileModal;
