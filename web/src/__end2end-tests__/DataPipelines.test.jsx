import ProjectGeneralInfoApi from 'apis/ProjectGeneralInfoApi';
import uuidv1 from 'uuid/v1';
import waitForExpect from 'wait-for-expect';
import store from 'store';
import * as types from 'actions/actionTypes';
import MLRAuthApi from 'apis/MLAuthApi';
import CommitsApi from 'apis/CommitsApi.ts';
import DataPipelineApi from 'apis/DataPipelineApi';
import JobsApi from 'apis/JobsApi';
import GitlabPipelinesApi from 'apis/GitlabPipelinesApi';
import UserApi from './apiMocks/UserApi.ts';

const userApi = new UserApi();
const authApi = new MLRAuthApi();
const projectApi = new ProjectGeneralInfoApi();
const commitApi = new CommitsApi();
const dataPipelineApi = new DataPipelineApi();
const jobApi = new JobsApi();
const gitlabPipelinesApi = new GitlabPipelinesApi();

let username;
let pipelineId;

let project;
let pipeline;

jest.setTimeout(100000);
beforeAll(async () => {
  // ------------- create the user ------------- //
  const suffix = uuidv1().toString().split('-')[0];
  username = `TEST-ProjectGeneralInfoApi.${suffix}`;
  const password = 'password';
  const email = `TEST-Node.${suffix}@example.com`;
  const registerData = {
    username,
    email,
    password,
    name: username,
  };
  const registerResponse = await userApi.register(registerData);
  expect(registerResponse.ok).toBeTruthy();

  // ----------- login with newly create user ----------- //
  if (!store.getState().user.isAuth) {
    await authApi.login(username, email, password)
      .then((user) => store.dispatch({ type: types.LOGIN, user }));
  }

  const request = {
    name: 'Data Pipelines test project',
    slug: 'can-create-project',
    namespace: '',
    initialize_with_readme: false,
    description: '',
    visibility: 'private',
    input_data_types: [],
  };

  const response = await projectApi.create(request, 'data-project', false)
    .catch((err) => {
      expect(true).not.toBe(true);
      return err;
    });

  expect(response.name).toBe(request.name);
  expect(response.slug).toBe(request.slug);

  project = response;
  console.log(`Running Pipeline tests against project: ${project.url}`);

  const commit = await commitApi.performCommit(
    project.gitlab_id,
    'data/text.txt',
    '####',
    'master',
    'Add mock data file',
    'create',
  );
  expect(commit.title).toBe('Add mock data file');
  expect(commit.project_id).toBe(project.gitlab_id);
});

test('Can create empty data pipeline', async () => {
  const body = {
    name: 'test-pipeline',
    source_branch: 'master',
    pipeline_type: 'DATA',
    input_files: [{
      location: 'data/',
    }],
    data_operations: [],
  };
  const response = await (await dataPipelineApi.create(project.id, body));
  expect(response.name).toBe('data-pipeline/test-pipeline');
  expect(response.pipeline_type).toBe('DATA');
  expect(response.slug).toBe('data-pipeline-test-pipeline-1');
  expect(response.data_operations.length).toBe(0);
});

test('Project has exactly one pipeline after pipeline creatio', async () => {
  // This test relies on the previous tests to create a data pipeline
  const response = await dataPipelineApi.getProjectPipelines(project.id);

  expect(response.length).toBe(1);
  expect(response[0].name).toBe('data-pipeline/test-pipeline');
  expect(response[0].pipeline_type).toBe('DATA');
  expect(response[0].slug).toBe('data-pipeline-test-pipeline');
  expect(response[0].data_operations.length).toBe(0);
});

test('Can get Pipeline Instance for created data pipeline', async () => {
  // This test relies on the previous tests to create a data pipeline
  let resp = [];
  setTimeout(async () => {
    const response = await jobApi.getPerProject(project.gitlab_id);
    resp = response;
  }, 50000);

  await waitForExpect(() => {
    expect(resp.length > 0).toBeTruthy();
  }, 50000);
  console.log(resp);
});

test('Can create pipeline with data operation', async () => {
  const body = {
    name: 'test-pipeline-noise',
    source_branch: 'master',
    pipeline_type: 'DATA',
    input_files: [{
      location: 'data/',
    }],
    data_operations: [{
      slug: 'commons-add-noise',
      parameters: [
        {name: 'input-path', value: 'data'},
        {name: 'output-path', value: '.'},
        {name: 'mode', value: 'gaussian'},
      ],
    }],
  };

  const response = await (await dataPipelineApi.create(project.id, body));
  expect(response.name).toBe('data-pipeline/test-pipeline-noise');
  expect(response.pipeline_type).toBe('DATA');
  expect(response.slug).toBe('data-pipeline-test-pipeline-noise-1');
  expect(response.data_operations.length).toBe(1);
});

test('Pipeline was created in Gitlab', async () => {
  let pipelines = [];

  setTimeout(async () => {
    pipelines = await gitlabPipelinesApi.getPipesByProjectId(project.gitlab_id);
    // pipelines = await jobApi.getPerProject(project.gitlab_id);
  }, 50000);

  await waitForExpect(() => {
    // const pipelines = gitlabPipelinesApi.getPipesByProjectId(project.gitlab_id);
    for (let _i = 0; _i < pipelines.length; _i++) {
      let pipe = pipelines[_i];
      if (pipe.ref === 'data-pipeline/test-pipeline-noise-1') {
        pipelineId = pipe.id;
        break;
      }
    }
    expect(pipelineId).toBeDefined();
  }, 50000);
});

test('Gitlab started pipeline with created data operation', async () => {
  console.log(`User name: ${username}`);
  console.log(`Project id: ${project.gitlab_id}`);
  console.log(`Pipeline id: ${pipelineId}`);

  let response = await gitlabPipelinesApi.getPipesById(project.gitlab_id, pipelineId);
  let iteration = 0;
  console.log(response);

  while (iteration < 10 && response.status === 'pending') {
    setTimeout(() => {
      const resp = gitlabPipelinesApi.getPipesById(project.id, pipelineId);
      iteration += 1;
      response = resp;
      console.log(response);
    }, 1000);
  }

  expect(response.status !== 'running' || response.status !== 'failed').toBeTruthy();
});