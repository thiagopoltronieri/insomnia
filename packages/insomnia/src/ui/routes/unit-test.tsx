import classnames from 'classnames';
import React, { FC, Fragment, Suspense, useState } from 'react';
import { Breadcrumbs, Button as AriaButton, Item, Link, ListBox, Popover, Select, SelectValue } from 'react-aria-components';
import {
  LoaderFunction,
  NavLink,
  Route,
  Routes,
  useFetcher,
  useFetchers,
  useLoaderData,
  useNavigate,
  useParams,
  useRouteLoaderData,
} from 'react-router-dom';

import * as models from '../../models';
import { Environment } from '../../models/environment';
import type { UnitTestSuite } from '../../models/unit-test-suite';
import { invariant } from '../../utils/invariant';
import { Dropdown, DropdownButton, DropdownItem, ItemContent } from '../components/base/dropdown';
import { WorkspaceDropdown } from '../components/dropdowns/workspace-dropdown';
import { WorkspaceSyncDropdown } from '../components/dropdowns/workspace-sync-dropdown';
import { Icon } from '../components/icon';
import { showPrompt } from '../components/modals';
import { CookiesModal } from '../components/modals/cookies-modal';
import { WorkspaceEnvironmentsEditModal } from '../components/modals/workspace-environments-edit-modal';
import { SidebarLayout } from '../components/sidebar-layout';
import { Button } from '../components/themed-button';
import { TestRunStatus } from './test-results';
import TestSuiteRoute from './test-suite';
import { WorkspaceLoaderData } from './workspace';

interface LoaderData {
  unitTestSuites: UnitTestSuite[];
}

export const loader: LoaderFunction = async ({
  params,
}): Promise<LoaderData> => {
  const { workspaceId } = params;

  invariant(workspaceId, 'Workspace ID is required');

  const unitTestSuites = await models.unitTestSuite.findByParentId(workspaceId);
  invariant(unitTestSuites, 'Unit test suites not found');

  return {
    unitTestSuites,
  };
};

const TestRoute: FC = () => {
  const { unitTestSuites } = useLoaderData() as LoaderData;

  const { organizationId, projectId, workspaceId, testSuiteId } = useParams() as {
    organizationId: string;
    projectId: string;
    workspaceId: string;
    testSuiteId: string;
  };

  const {
    activeProject,
    activeEnvironment,
    activeCookieJar,
    subEnvironments,
    baseEnvironment,
  } = useRouteLoaderData(':workspaceId') as WorkspaceLoaderData;
  const setActiveEnvironmentFetcher = useFetcher();
  const environmentsList = [baseEnvironment, ...subEnvironments].map(e => ({
    id: e._id,
    name: e.name,
    color: e.color,
  }));

  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [isEnvironmentModalOpen, setEnvironmentModalOpen] = useState(false);

  const createUnitTestSuiteFetcher = useFetcher();
  const deleteUnitTestSuiteFetcher = useFetcher();
  const runAllTestsFetcher = useFetcher();
  const runningTests = useFetchers()
    .filter(
      fetcher =>
        fetcher.formAction?.includes('run-all-tests') ||
        fetcher.formAction?.includes('run')
    )
    .some(({ state }) => state !== 'idle');

  const navigate = useNavigate();

  return (
    <SidebarLayout
      className='new-sidebar'
      renderPageSidebar={
        <div className="flex flex-1 flex-col overflow-hidden divide-solid divide-y divide-[--hl-md]">
          <div className="flex flex-col items-start gap-2 justify-between p-[--padding-sm]">
            <Breadcrumbs className='react-aria-Breadcrumbs pb-3 border-b border-solid border-[--hl-sm] font-bold flex py-[--padding-sm] w-full'>
              <Item className="react-aria-Item outline-none data-[focused]:outline-none">
                <Link data-testid="project" className="px-1 py-1 aspect-square flex flex-1 outline-none data-[focused]:outline-none items-center justify-center gap-2 aria-pressed:bg-[--hl-sm] rounded-sm text-[--color-font] hover:bg-[--hl-xs] focus:ring-inset ring-1 ring-transparent focus:ring-[--hl-md] transition-all text-sm">
                  <NavLink
                    to={`/organization/${organizationId}/project/${activeProject._id}`}
                  >
                    <Icon className='text-xs' icon="chevron-left" />
                  </NavLink>
                </Link>
              </Item>
              <Item>
                <WorkspaceDropdown />
              </Item>
            </Breadcrumbs>
            <div className="flex w-full items-center gap-2 justify-between">
              <Select
                aria-label="Select an environment"
                onSelectionChange={environmentId => {
                  setActiveEnvironmentFetcher.submit(
                    {
                      environmentId,
                    },
                    {
                      method: 'POST',
                      action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/environment/set-active`,
                    }
                  );
                }}
                selectedKey={activeEnvironment._id}
                items={environmentsList}
              >
                <AriaButton className="px-4 py-1 flex flex-1 items-center justify-center gap-2 aria-pressed:bg-[--hl-sm] rounded-sm text-[--color-font] hover:bg-[--hl-xs] focus:ring-inset ring-1 ring-transparent focus:ring-[--hl-md] transition-all text-sm">
                  <SelectValue<Environment> className="flex truncate items-center justify-center gap-2">
                    {({ isPlaceholder, selectedItem }) => {
                      if (
                        isPlaceholder ||
                        (selectedItem &&
                          selectedItem._id === baseEnvironment._id) ||
                        !selectedItem
                      ) {
                        return (
                          <Fragment>
                            <Icon icon="cancel" />
                            No Environment
                          </Fragment>
                        );
                      }

                      return (
                        <Fragment>
                          <Icon
                            icon="circle"
                            style={{
                              color: selectedItem.color ?? 'var(--color-font)',
                            }}
                          />
                          {selectedItem.name}
                        </Fragment>
                      );
                    }}
                  </SelectValue>
                  <Icon icon="caret-down" />
                </AriaButton>
                <Popover className="min-w-max">
                  <ListBox<Environment>
                    key={activeEnvironment._id}
                    className="border select-none text-sm min-w-max border-solid border-[--hl-sm] shadow-lg bg-[--color-bg] py-2 rounded-md overflow-y-auto max-h-[85vh] focus:outline-none"
                  >
                    {item => (
                      <Item
                        id={item._id}
                        key={item._id}
                        className="flex gap-2 px-[--padding-md] aria-selected:font-bold items-center text-[--color-font] h-[--line-height-xs] w-full text-md whitespace-nowrap bg-transparent hover:bg-[--hl-sm] disabled:cursor-not-allowed focus:bg-[--hl-xs] focus:outline-none transition-colors"
                        aria-label={item.name}
                        textValue={item.name}
                        value={item}
                      >
                        {({ isSelected }) => (
                          <Fragment>
                            <Icon
                              icon={
                                item._id === baseEnvironment._id
                                  ? 'cancel'
                                  : 'circle'
                              }
                              style={{
                                color: item.color ?? 'var(--color-font)',
                              }}
                            />
                            <span>
                              {item._id === baseEnvironment._id
                                ? 'No Environment'
                                : item.name}
                            </span>
                            {isSelected && (
                              <Icon
                                icon="check"
                                className="text-[--color-success] justify-self-end"
                              />
                            )}
                          </Fragment>
                        )}
                      </Item>
                    )}
                  </ListBox>
                </Popover>
              </Select>
              <AriaButton
                aria-label='Manage Environments'
                onPress={() => setEnvironmentModalOpen(true)}
                className="flex flex-shrink-0 items-center justify-center aspect-square h-full aria-pressed:bg-[--hl-sm] rounded-sm text-[--color-font] hover:bg-[--hl-xs] focus:ring-inset ring-1 ring-transparent focus:ring-[--hl-md] transition-all text-sm"
              >
                <Icon icon="gear" />
              </AriaButton>
            </div>
            <AriaButton
              onPress={() => setIsCookieModalOpen(true)}
              className="px-4 py-1 flex-1 flex items-center justify-center gap-2 aria-pressed:bg-[--hl-sm] rounded-sm text-[--color-font] hover:bg-[--hl-xs] focus:ring-inset ring-1 ring-transparent focus:ring-[--hl-md] transition-all text-sm"
            >
              <Icon icon="cookie-bite" />
              {activeCookieJar.cookies.length === 0 ? 'Add' : 'Manage'} Cookies
            </AriaButton>
          </div>
          <div className="unit-tests__sidebar">
            <div className="pad-sm">
              <Button
                variant="outlined"
                onClick={() => {
                  showPrompt({
                    title: 'New Test Suite',
                    defaultValue: 'New Suite',
                    submitName: 'Create Suite',
                    label: 'Test Suite Name',
                    selectText: true,
                    onComplete: async name => {
                      createUnitTestSuiteFetcher.submit(
                        {
                          name,
                        },
                        {
                          method: 'post',
                          action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/test/test-suite/new`,
                        }
                      );
                    },
                  });
                }}
              >
                New Test Suite
              </Button>
            </div>
            <ul>
              {unitTestSuites.map(suite => (
                <li
                  key={suite._id}
                  className={classnames({
                    active: suite._id === testSuiteId,
                  })}
                >
                  <button
                    onClick={e => {
                      e.preventDefault();
                      navigate(
                        `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/test/test-suite/${suite._id}`
                      );
                    }}
                  >
                    {suite.name}
                  </button>

                  <Dropdown
                    aria-label='Test Suite Actions'
                    triggerButton={
                      <DropdownButton className="unit-tests__sidebar__action">
                        <i className="fa fa-caret-down" />
                      </DropdownButton>
                    }
                  >
                    <DropdownItem aria-label='Run Tests'>
                      <ItemContent
                        stayOpenAfterClick
                        isDisabled={runAllTestsFetcher.state === 'submitting'}
                        label={runAllTestsFetcher.state === 'submitting'
                          ? 'Running... '
                          : 'Run Tests'}
                        onClick={() => {
                          runAllTestsFetcher.submit(
                            {},
                            {
                              method: 'post',
                              action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/test/test-suite/${suite._id}/run-all-tests`,
                            }
                          );
                        }}
                      />
                    </DropdownItem>
                    <DropdownItem aria-label='Delete Suite'>
                      <ItemContent
                        label="Delete Suite"
                        withPrompt
                        onClick={() =>
                          deleteUnitTestSuiteFetcher.submit(
                            {},
                            {
                              action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/test/test-suite/${suite._id}/delete`,
                              method: 'post',
                            }
                          )
                        }
                      />
                    </DropdownItem>
                  </Dropdown>
                </li>
              ))}
            </ul>
          </div>
          <WorkspaceSyncDropdown />
          {isEnvironmentModalOpen && (
            <WorkspaceEnvironmentsEditModal
              onHide={() => setEnvironmentModalOpen(false)}
            />
          )}
          {isCookieModalOpen && (
            <CookiesModal onHide={() => setIsCookieModalOpen(false)} />
          )}
        </div>
      }
      renderPaneOne={
        <Routes>
          <Route
            path={'test-suite/:testSuiteId/*'}
            element={
              <Suspense>
                <TestSuiteRoute />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <div className="unit-tests pad theme--pane__body">
                No test suite selected
              </div>
            }
          />
        </Routes>
      }
      renderPaneTwo={
        <Routes>
          <Route
            path="test-suite/:testSuiteId/test-result/:testResultId"
            element={
              runningTests ? (
                <div className="unit-tests__results">
                  <div className="unit-tests__top-header">
                    <h2>Running Tests...</h2>
                  </div>
                </div>
              ) : (
                <TestRunStatus />
              )
            }
          />
          <Route
            path="*"
            element={
              runningTests ? (
                <div className="unit-tests__results">
                  <div className="unit-tests__top-header">
                    <h2>Running Tests...</h2>
                  </div>
                </div>
              ) : (
                <div className="unit-tests__results">
                  <div className="unit-tests__top-header">
                    <h2>No Results</h2>
                  </div>
                </div>
              )
            }
          />
        </Routes>
      }
    />
  );
};

export default TestRoute;
