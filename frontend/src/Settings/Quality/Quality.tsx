import React from 'react';
import FieldSet from 'Components/FieldSet';
import Label from 'Components/Label';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageSectionContent from 'Components/Page/PageSectionContent';
import { kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';

function Quality() {
  return (
    <PageContent title={translate('QualitySettings')}>
      <PageContentBody>
        <FieldSet legend={translate('Quality')}>
          <PageSectionContent>
            <div>
              <Label kind={kinds.INFO}>720p</Label>
              <Label kind={kinds.INFO}>1080p</Label>
              <Label kind={kinds.INFO}>4K</Label>
            </div>
          </PageSectionContent>
        </FieldSet>
      </PageContentBody>
    </PageContent>
  );
}

export default Quality;
