import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache
} from 'apollo-boost';
import gql from 'graphql-tag';
import { isLoggedIn, getAccessToken } from './auth';

const endpointURL = 'http://localhost:9000/graphql';

const authLink = new ApolloLink((operation, forward) => {
  if (isLoggedIn()) {
    // set the headers in operation conext
    operation.setContext({
      headers: {
        authorization: `Bearer ${getAccessToken()}`
      }
    });
  }
  return forward(operation);
});

// authLink executes before HttpLink
const client = new ApolloClient({
  link: ApolloLink.from([authLink, new HttpLink({ uri: endpointURL })]),
  cache: new InMemoryCache()
});

// use gql fragment to avoid code duplication
const jobDetailFragment = gql`
  fragment JobDetail on Job {
    id
    title
    company {
      id
      name
    }
    description
  }
`;

const jobsQuery = gql`
  query JobsQuery {
    jobs {
      id
      title
      company {
        id
        name
      }
    }
  }
`;

const jobQuery = gql`
  query JobQuery($id: ID!) {
    job(id: $id) {
      ...JobDetail
    }
  }
  ${jobDetailFragment}
`;

const companyQuery = gql`
  query CompanyQuery($id: ID!) {
    company(id: $id) {
      id
      name
      description
      jobs {
        id
        title
      }
    }
  }
`;

const createJobMutation = gql`
  mutation CreateJob($input: CreateJobInput) {
    job: createJob(input: $input) {
      ...JobDetail
    }
  }
  ${jobDetailFragment}
`;

// async function graphqlRequest(query, variables = {}) {
//   const request = {
//     method: 'POST',
//     headers: {
//       'content-type': 'application/json'
//     },
//     body: JSON.stringify({ query, variables })
//   };

//   if (isLoggedIn()) {
//     request.headers['authorization'] = `Bearer ${getAccessToken()}`;
//   }
//   const response = await fetch(endpointURL, request);
//   const responseBody = await response.json();

//   if (responseBody.errors) {
//     const message = responseBody.errors
//       .map((error) => error.message)
//       .join('\n');
//     throw new Error(message);
//   }
//   return responseBody.data;
// }

export async function createJob(input) {
  const {
    data: { job }
  } = await client.mutate({
    mutation: createJobMutation,
    variables: { input },
    // data - mutation response
    update: (cache, { data }) => {
      cache.writeQuery({
        query: jobQuery,
        variables: { id: data.job.id },
        // data to keep in cache
        data
      });
    }
  });
  //const { job } = await graphqlRequest(mutation, { input });
  return job;
}

export async function loadCompany(id) {
  const {
    data: { company }
  } = await client.query({ query: companyQuery, variables: { id } });
  //   const { company } = await graphqlRequest(query, { id });
  return company;
}

export async function loadJob(id) {
  const {
    data: { job }
  } = await client.query({ query: jobQuery, variables: { id } });
  //const { job } = await graphqlRequest(query, { id });
  return job;
}

export async function loadJobs() {
  const {
    data: { jobs }
  } = await client.query({ query: jobsQuery, fetchPolicy: 'no-cache' });

  //const { jobs } = await graphqlRequest(query);

  return jobs;
}
