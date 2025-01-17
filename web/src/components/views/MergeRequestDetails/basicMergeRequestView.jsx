import React, { useState, useCallback, useEffect } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  shape, string, arrayOf,
} from 'prop-types';
import { toastr } from 'react-redux-toastr';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ReactMarkdown from 'react-markdown';
import { MergeRequestEditWithActions } from 'components/layout/MergeRequests';
import ACCESS_LEVEL from 'domain/accessLevels';
import * as mergeRequestActions from 'store/actions/mergeActions';
import { pluralize as plu } from 'functions/dataParserHelpers';
import MCheckBox from 'components/ui/MCheckBox/MCheckBox';
import AuthWrapper from 'components/AuthWrapper';
import MSimpleTabs from 'components/ui/MSimpleTabs';
import hooks from 'customHooks/useSelectedProject';
import CommitsList from 'components/layout/CommitsList/CommitList';
import MButton from 'components/ui/MButton';
import MLoadingSpinnerContainer from 'components/ui/MLoadingSpinner/MLoadingSpinnerContainer';
import MWrapper from 'components/ui/MWrapper';
import ChangesMrSection from 'components/ChangesMRSection/ChangesMrSection';
import Navbar from 'components/navbar/navbar';
import MergeRequestAPI from 'apis/MergeRequestApi.ts';
import BranchesApi from 'apis/BranchesApi.ts';
import ProjectContainer from 'components/projectContainer';
import './basicMR.css'; 

dayjs.extend(relativeTime);

const brApi = new BranchesApi();

const mergeRequestAPI = new MergeRequestAPI();

const BasicMergeRequestView = (props) => {
  const {
    match: { params: { iid, namespace, slug } },
    users,
    mrInfo,
    actions,
  } = props;

  const [selectedProject, isFetching] = hooks.useSelectedProject(namespace, slug);
  const {
    gid,
  } = selectedProject;

  let mergerName;
  let mergerAvatar;
  let mergedAt;
  let closeName;
  let closeAvatar;
  let closedAt;

  const [behind, setBehind] = useState(0);
  const [aheadCommits, setAheadCommits] = useState([]);
  const [diffs, setDiffs] = useState([]);
  const [squash, setSquash] = useState(false);
  const [removeBranch, setRemoveBranch] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const { title, description, state } = mrInfo;

  const sourceBranch = mrInfo.source_branch;
  const targetBranch = mrInfo.target_branch;
  const createdAt = mrInfo.created_at;
  const updatedAt = mrInfo.updated_at;
  const hasConflicts = mrInfo.has_conflicts;

  const name = mrInfo.author && mrInfo.author.name;
  const avatarUrl = mrInfo.author && mrInfo.author.avatar_url;

  const handleCloseMergeRequest = () => {
    actions.closeMergeRequest(gid, iid);
  };

  const handleReopenMergeRequest = () => {
    actions.reopenMergeRequest(gid, iid);
  };

  const handleUpdateMergeRequest = (fields) => {
    setWaiting(true);
    actions.updateMergeRequest(gid, iid, fields)
      .then(() => setEditMode(false))
      .catch((er) => toastr.error("Changes weren't saved.", er.message))
      .finally(() => setWaiting(false));
  };

  const fetchMergeRequestInfo = useCallback(
    () => {
      if (gid) actions.getMergeRequest(gid, iid);
    }, [actions, gid, iid],
  );

  const acceptMergeRequest = () => {
    setWaiting(true);

    mergeRequestAPI.acceptMergeRequest(gid, iid, squash, removeBranch)
      .then(() => {
        toastr.success('Merged successfully:');
        fetchMergeRequestInfo();
      })
      .catch((err) => {
        toastr.error('Unable to merge', err.message);
      })
      .finally(() => { setWaiting(false); });
  };

  if (state === 'closed') {
    closeName = mrInfo.closed_by.name;
    closeAvatar = mrInfo.closed_by.avatar_url;
    closedAt = mrInfo.closed_at;
  } else if (state === 'merged') {
    mergerName = mrInfo.merged_by.name;
    mergerAvatar = mrInfo.merged_by.avatar_url;
    mergedAt = mrInfo.merged_at;
  }

  useEffect(() => { fetchMergeRequestInfo(); }, [fetchMergeRequestInfo]);

  // fetch changes
  useEffect(() => {
    if (gid && sourceBranch && targetBranch) {
      brApi.compare(gid, sourceBranch, targetBranch)
        .then((res) => setBehind(res.commits));

      brApi.compare(gid, targetBranch, sourceBranch)
        .then((res) => {
          setAheadCommits(res.commits);
          setDiffs(res.diffs);
        });
    }
  }, [gid, iid, sourceBranch, targetBranch]);

  const customCrumbs = [
    {
      name: 'Data',
      href: `/${namespace}/${slug}`,
    },
    {
      name: 'Merge Requests',
      href: `/${namespace}/${slug}/-/merge_requests`,
    },
    {
      name: `${iid}`,
      href: `/${namespace}/${slug}/-/merge_requests/${iid}`,
    },
  ];

  const actionButtons = (
    <div style={{ height: 'max-content' }} className="modify-MR mr-0">
      {state === 'opened' && (
        <>
          <button
            type="button"
            id="edit-btn"
            className="btn btn-outline-dark"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Stop editing' : 'Edit'}
          </button>

          <button
            type="button"
            id="close-mr-btn"
            className="btn btn-outline-danger ml-3"
            onClick={handleCloseMergeRequest}
          >
            Close Merge Request
          </button>
        </>
      )}

      {state === 'closed' && (
        <button
          type="button"
          id="reopen-mr-btn"
          className="btn btn-outline-warning ml-3"
          onClick={handleReopenMergeRequest}
        >
          Reopen Merge Request
        </button>
      )}
    </div>
  );

  if (isFetching) {
    return (
      <MLoadingSpinnerContainer active />
    );
  }

  return (
    <>
      <Navbar />
      <ProjectContainer
        activeFeature="data"
        breadcrumbs={customCrumbs}
      />
      <div className="basic-merge-request-view-content main-content v1023">
        <div style={{ display: 'flex', marginTop: '1em' }}>
          <div style={{ flex: '1' }}>
            <p style={{ marginBottom: '0' }}>
              <span className={`state-config ${state}`}>OPEN</span>
              <span style={{ fontWeight: '600' }}>{title}</span>
            </p>
            <div style={{ display: 'flex' }}>
              <p>
                {`Opened ${dayjs(createdAt).fromNow()} by`}
              </p>
              <Link className="my-auto d-flex" to={`/${name}`}>
                <img className="avatar-circle ml-2 mr-1" width="24" src={avatarUrl} alt="avatar" />
                <span className="my-auto">
                  <b>{name}</b>
                </span>
              </Link>
            </div>
          </div>
          <AuthWrapper minRole={ACCESS_LEVEL.DEVELOPER} norender>
            {actionButtons}
          </AuthWrapper>

        </div>
        <br />
        <MSimpleTabs
          className="basic-merge-request-view-tabs"
          border
          sections={[
            {
              label: 'Overview',
              content: editMode ? (
                <MergeRequestEditWithActions
                  title={title}
                  description={description}
                  onSave={handleUpdateMergeRequest}
                  onCancel={() => setEditMode(false)}
                  waiting={waiting}
                />
              ) : (
                <>
                  {description && (
                  <div style={{ padding: '1em 2em' }}>
                    <ReactMarkdown source={description} />
                    <p className="faded-style">
                      {`Edited ${dayjs(updatedAt).fromNow()}`}
                    </p>
                  </div>
                  )}
                  <div className="request-to-merge">
                    <b>Request to merge </b>
                    {decodeURIComponent(sourceBranch)}
                    <b> into </b>
                    {` ${targetBranch}`}
                    {state === 'opened' && (
                    <p>
                      {'The source branch is '}
                      <b className="addition">
                        {`${aheadCommits.length} commit${plu(aheadCommits.length)} ahead`}
                      </b>
                      {' and'}
                      <b className="deleted">
                        {` ${behind.length} commit${plu(behind.lengt)} behind`}
                      </b>
                      {' target branch.'}
                    </p>
                    )}
                  </div>
                  <div className="vertical" />
                  <AuthWrapper minRole={ACCESS_LEVEL.DEVELOPER} norender>
                    <div className="state-box">

                      {state === 'merged'
                        && (
                        <div>
                          <h4 style={{ display: 'flex' }}>
                            <b>
                              Merged by
                            </b>
                            <div style={{ margin: '0 4px 0 2px' }}>
                              <img className="avatar-style" width="16" src={mergerAvatar} alt="avatar" />
                            </div>
                            {`${mergerName} ${dayjs(mergedAt).fromNow()}`}
                            <button className="revert-merge" type="button">
                              Revert
                            </button>
                          </h4>
                          <section>
                            <p>
                              {'The changes were merged into '}
                              <b>{targetBranch}</b>
                            </p>
                            <p>
                              {(mrInfo.force_remove_source_branch
                                || mrInfo.should_remove_source_branch) && (
                                  <span>The source branch has been deleted</span>
                              )}
                            </p>
                          </section>
                        </div>
                        )}

                      {state === 'closed'
                        && (
                          <div>
                            <h4 style={{ display: 'flex' }}>
                              Closed by
                              <div style={{ margin: '0 4px 0 2px' }}>
                                <img className="avatar-style" width="16" src={closeAvatar} alt="avatar" />
                              </div>
                              {`${closeName} ${dayjs(closedAt).fromNow()}`}
                            </h4>
                            <section>
                              <p>
                                {'The changes were not merged into '}
                                <b>{targetBranch}</b>
                              </p>
                            </section>
                          </div>
                        )}

                      {state === 'opened'
                          && (
                            <>
                              <div style={{ display: 'flex' }}>
                                <MButton
                                  className="merge-action btn btn-primary my-auto mr-3"
                                  disabled={hasConflicts}
                                  onClick={acceptMergeRequest}
                                  waiting={waiting}
                                  label="Merge"
                                />
                                {!hasConflicts ? (
                                  <>
                                    <MCheckBox
                                      name="delete"
                                      labelValue="Delete branch"
                                      callback={() => setRemoveBranch(!removeBranch)}
                                    />
                                    <MCheckBox
                                      name="squash"
                                      labelValue="Squash commits"
                                      onChange={() => setSquash(!squash)}
                                    />
                                  </>
                                )
                                  : (
                                    <MWrapper norender>
                                      <p>
                                        There are merge conflicts&nbsp;
                                      </p>
                                    </MWrapper>
                                  )}
                              </div>
                              {!hasConflicts && (
                                <div>
                                  <p>
                                    {squash ? '1 commit' : `${aheadCommits.length} commit${plu(aheadCommits.length)}`}
                                    {' and 1 merge commit will be added into '}
                                    <b>{targetBranch}</b>
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                    </div>
                  </AuthWrapper>

                </>
              ),
            },
            {
              label: `${aheadCommits.length} Commit${plu(aheadCommits.length)}`,
              content: aheadCommits.length > 0 && (
                <CommitsList
                  commits={aheadCommits}
                  users={users}
                  projectId={selectedProject.gid}
                  changesNumber={diffs.length}
                  namespace={namespace}
                  slug={slug}
                  branch={targetBranch}
                />
              ),
            },
            {
              label: `${diffs.length} Change${plu(diffs.length)}`,
              content: (
                <ChangesMrSection projectId={gid} aheadCommits={aheadCommits} />
              ),
            },
          ]}
        />
      </div>
    </>
  );
};

function mapStateToProps(state) {
  return {
    selectedProject: state.projects.selectedProject,
    users: state.users,
    mrInfo: state.mergeRequests.current,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators({
      ...mergeRequestActions,
    }, dispatch),
  };
}

BasicMergeRequestView.defaultProps = {
  match: {
    params: {},
  },
};

BasicMergeRequestView.propTypes = {
  match: shape({
    params: shape({
      iid: string.isRequired,
    }),
  }),
  users: arrayOf(shape({})).isRequired,
  mrInfo: shape({}).isRequired,
  actions: shape({}).isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(BasicMergeRequestView);
