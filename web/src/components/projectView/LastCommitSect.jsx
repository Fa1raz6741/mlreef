import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toastr } from 'react-redux-toastr';
import {
  string, number, shape, arrayOf,
} from 'prop-types';
import { parseToCamelCase, getTimeCreatedAgo } from 'functions/dataParserHelpers';
import { getCommits, getCommitDetails } from 'functions/apiCalls';

const ProjectLastCommitSect = ({
  projectId,
  branch: urlBranch,
  projectDefaultBranch,
  users,
  testCommitData,
  lastCommitId,
}) => {
  const [lastCommit, setLastCommit] = useState(null);
  useEffect(() => {
    if (projectId && urlBranch) {
      const commitBranch = urlBranch && urlBranch !== '' && urlBranch !== 'null'
        ? urlBranch
        : projectDefaultBranch;

      getCommits(projectId, commitBranch).then((res) => setLastCommit(parseToCamelCase(res[0])))
        .catch(() => toastr.error('Error', 'Error fetching last commit'));
    }

    if (projectId && lastCommitId !== 0) {
      getCommitDetails(projectId, lastCommitId)
        .then((res) => setLastCommit(parseToCamelCase(res)))
        .catch(() => toastr.error('Error', 'Error fetching last commit'));
    }
  }, [projectId, urlBranch, projectDefaultBranch, lastCommitId]);
  /*
    testCommitData is just for testing purposes, never and ever pass it for real functionality
  */
  if (!lastCommit && !testCommitData) return null;
  const finalCommitInfo = lastCommit || testCommitData;
  const committer = finalCommitInfo
    && users.filter((user) => user.name === finalCommitInfo.authorName)[0];
  const avatarUrl = committer ? (committer.avatarUrl || committer.avatar_url) : ''; // avatarUrl not found
  const avatarName = committer && committer.name;
  const today = new Date();
  const timediff = finalCommitInfo && getTimeCreatedAgo(finalCommitInfo.authoredDate, today);

  return (
    <div className="last-commit-info">
      <div className="last-commit-details">
        {committer && (
          <Link to={`/${avatarName}`}>
            <span style={{ position: 'relative' }}>
              <img className="avatar-circle mt-2" width="32" height="32" src={avatarUrl} alt="avatar" />
            </span>
          </Link>
        )}
        <div className="last-commit-name">
          <p>
            {finalCommitInfo.message}
            <br />
            {' '}
            by
            {' '}
            <b>
              {committer && (
                <Link to={`/${avatarName}`}>
                  {finalCommitInfo.authorName}
                </Link>
              )}
            </b>
            {' '}
            authored
            {' '}
            <b>{timediff}</b>
            {' '}
            ago
          </p>
        </div>
      </div>
      <div className="last-commit-id">
        <p>{finalCommitInfo.shortId}</p>
      </div>
    </div>
  );
};

ProjectLastCommitSect.defaultProps = {
  users: [],
  testCommitData: {},
};

ProjectLastCommitSect.propTypes = {
  projectId: number.isRequired,
  branch: string.isRequired,
  lastCommitId: number,
  projectDefaultBranch: string.isRequired,
  users: arrayOf(shape({ name: string.isRequired })),
  testCommitData: shape({}),
};

ProjectLastCommitSect.defaultProps = {
  lastCommitId: 0, // in the reality gitlab will never use 0 as commit id
};

export default ProjectLastCommitSect;