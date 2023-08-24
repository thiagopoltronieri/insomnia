import React, { FC, Fragment, useState } from 'react';
import { useFetcher } from 'react-router-dom';

import { toKebabCase } from '../../../common/misc';
import {
  isDefaultOrganizationProject,
  Project,
} from '../../../models/project';
import { Dropdown, DropdownButton, DropdownItem, ItemContent } from '../base/dropdown';
import ProjectSettingsModal from '../modals/project-settings-modal';

interface Props {
  project: Project;
  organizationId: string;
}

export const ProjectDropdown: FC<Props> = ({ project, organizationId }) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const deleteProjectFetcher = useFetcher();
  return (
    <Fragment>
      <Dropdown
        aria-label='Project Dropdown'
        dataTestId={toKebabCase(`ProjectDropDown-${project.name}`)}
        items={[{
          label: 'Settings',
          icon: 'gear',
          onClick: () => setIsSettingsModalOpen(true),
        }, ...isDefaultOrganizationProject(project) ? [] : [{
          label: 'Delete',
          icon: 'trash-o',
          className: 'danger',
          withPrompt: true,
          onClick: () =>
            deleteProjectFetcher.submit(
              {},
              { method: 'post', action: `/organization/${organizationId}/project/${project._id}/delete` }
            ),
        }]]}
        triggerButton={
          <DropdownButton className="row" title={project.name}>
            <i className="fa fa-ellipsis space-left" />
          </DropdownButton>
        }
      >
        {(item => {
          return (
            <DropdownItem key={item.label} aria-label={item.label}>
              <ItemContent
                icon={item.icon}
                style={{ gap: 'var(--padding-sm)' }}
                iconStyle={{ width: 'unset', fill: 'var(--hl)' }}
                label={item.label}
                withPrompt={item.withPrompt}
                onClick={item.onClick}
              />
            </DropdownItem>
          );
        })}
        {/* <DropdownItem aria-label={`${strings.project.singular} Settings`}>
          <ItemContent
            icon="gear"
            style={{ gap: 'var(--padding-sm)' }}
            iconStyle={{ width: 'unset', fill: 'var(--hl)' }}
            label={`${strings.project.singular} Settings`}
            onClick={() => setIsSettingsModalOpen(true)}
          />
        </DropdownItem>
        <DropdownItem aria-label='Delete'>
          <ItemContent
            icon="trash-o"
            label="Delete"
            className="danger"
            withPrompt
            onClick={() =>
              deleteProjectFetcher.submit(
                {},
                { method: 'post', action: `/organization/${organizationId}/project/${project._id}/delete` }
              )
            }
          />
        </DropdownItem> */}
      </Dropdown>
      {isSettingsModalOpen && (
        <ProjectSettingsModal
          onHide={() => setIsSettingsModalOpen(false)}
          project={project}
        />
      )}
    </Fragment>
  );
};
