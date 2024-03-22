# CircleCI Build Guide Setup

  The following page provides a "getting started" example of CircleCI config.
  This config is used on a few active Studion projects. However, there are plans
  to make this guide obsolete by making Studion orb and a CLI script to generate
  config.yml file automatically. We can use this as a reference and to learn how to
  set up CircleCI. Especially as Studion orb(s) will be based off this setup.

## The application

  This guide assumes the application has the following components:
  - SPA frontend
  - Dockerfile for building server
  - Pulumi config for infrastructure

  This guide also assumes we are hosting the app on AWS.

## `./.circleci/config.yml`

  CircleCI uses `config.yml` file to define the tasks it will perform.
  The file should be placed inside `.circleci` directory in project root.
  Knowing YAML syntax is a prerequisite for writing CircleCI config.

  For better clarity, we will look at separate config blocks and describe what they do.

### Config Init

  Here we define the config version and dependencies.

  Orbs are CircleCI packages that allow us to define build process
  in a simple and easy way. Read more about orbs here https://circleci.com/orbs/.

  For this app, we need `aws-cli`, `aws-ecr`, `node` and `pulumi` orbs.


  ```yaml
    version: 2.1
    orbs:
      aws-cli: circleci/aws-cli@4.1.3
      aws-ecr: circleci/aws-ecr@9.0.4
      node: circleci/node@5.2.0
      pulumi: pulumi/pulumi@2.1.0

    executors:
      node:
        docker:
          - image: cimg/node:16.20.2
      base:
        docker:
          - image: cimg/base:stable-20.04
  ```

### AWS Credentials

  In case we have multiple AWS credentials, we can define them at the beginning and
  reuse them where applicable. In this example, we have Studion AWS account and client
  AWS account credentials.

  ```yaml
  studion-aws-credentials: &studion-aws-credentials
    access_key: STUDION_AWS_ACCESS_KEY
    secret_key: STUDION_AWS_SECRET_KEY
    region: ${STUDION_AWS_REGION}

  client-aws-credentials: &client-aws-credentials
    access_key: CLIENT_AWS_ACCESS_KEY
    secret_key: CLIENT_AWS_SECRET_KEY
    region: ${CLIENT_AWS_REGION}
  ```

  Note that we used YAML anchor here so we can reuse the credentials objects.
  Also, note that `access_key` and `secret_key` just contain the name of the env
  variable while `region` contains the actual value of the env variable.

  Environment variables are configured in CircleCI project settings
  within the CircleCI application.


### Job 1: Build Frontend

  This step pulls the code, injects secret .npmrc file, installs npm packages and
  runs build process. Finally, the output is persisted to workspace so we can upload
  it to S3 later in the build process.

  ```yaml
    jobs:
      build-frontend:
        working_directory: ~/app
        executor: node
        steps:
          - checkout
          - run:
              command: echo "@fortawesome:registry=https://npm.fontawesome.com/" > ~/app/.npmrc
          - run:
              command: echo "//npm.fontawesome.com/:_authToken=${FA_TOKEN}" >> ~/app/.npmrc
          - node/install-packages:
              override-ci-command: npm ci
          - run:
              name: Build frontend
              command: npm run build
          - persist_to_workspace:
              root: .
              paths:
                - dist
  ```

  In this example, we have .npmrc file that contains the auth token for Font Awesome Pro
  package. This is how we can construct that file so `npm install` can install all
  required packages.


### Job 2: Build server

  This step pulls the code and uses AWS ECR orb to build Docker image and push it to
  private AWS registry.

  ```yaml
    build-server:
      working_directory: ~/app
      executor:
        name: aws-ecr/default
        docker_layer_caching: true
      parameters:
        access_key:
          type: string
        secret_key:
          type: string
        region:
          type: string
        account_id:
          type: string
        ecr_repo:
          type: string
      resource_class: medium
      steps:
        - checkout
        - run:
            command: echo "@fortawesome:registry=https://npm.fontawesome.com/" > ~/app/.npmrc
        - run:
            command: echo "//npm.fontawesome.com/:_authToken=${FA_TOKEN}" >> ~/app/.npmrc
        - aws-ecr/build_and_push_image:
            auth:
              - aws-cli/setup:
                  aws_access_key_id: << parameters.access_key >>
                  aws_secret_access_key: << parameters.secret_key >>
                  region: << parameters.region >>
            account_id: << parameters.account_id >>
            attach_workspace: true
            checkout: false
            extra_build_args: "--secret id=npmrc_secret,src=.npmrc --target server"
            region: << parameters.region >>
            repo: << parameters.ecr_repo >>
            repo_encryption_type: KMS
            tag: latest,${CIRCLE_SHA1}
  ```

  Note that this step accepts parameters which will be passed later when we define
  the complete workflow.

  More info about AWS ECR orb can be found here:
  https://circleci.com/developer/orbs/orb/circleci/aws-ecr


### Job 3: Deploy infrastructure

  This part calls Pulumi to set up AWS resources.

  ```yaml
    deploy-aws:
      working_directory: ~/app
      executor: node
      parameters:
        access_key:
          type: string
        secret_key:
          type: string
        region:
          type: string
        account_id:
          type: string
        ecr_repo:
          type: string
        stack:
          type: string
      steps:
        - checkout
        - aws-cli/setup:
            aws_access_key_id: << parameters.access_key >>
            aws_secret_access_key: << parameters.secret_key >>
            region: << parameters.region >>
        - pulumi/login
        - node/install-packages:
            app-dir: ./infrastructure
        - run:
            name: Configure envs
            command: |
              echo 'export SERVER_IMAGE="<< parameters.account_id >>.dkr.ecr.<< parameters.region >>.amazonaws.com/<< parameters.ecr_repo >>:${CIRCLE_SHA1}"' >> "$BASH_ENV"
              source "$BASH_ENV"
        - pulumi/update:
            stack: "<< parameters.stack >>"
            working_directory: ./infrastructure
            skip-preview: true
        - pulumi/stack_output:
            stack: "<< parameters.stack >>"
            property_name: frontendBucketName
            env_var: S3_SITE_BUCKET
            working_directory: ./infrastructure
        - pulumi/stack_output:
            stack: "<< parameters.stack >>"
            property_name: cloudfrontId
            env_var: CF_DISTRIBUTION_ID
            working_directory: ./infrastructure
        - run:
            name: Store pulumi output as env file
            command: cp $BASH_ENV bash.env
        - persist_to_workspace:
            root: .
            paths:
              - bash.env
  ```

  Note that this step assumes that Pulumi files are located in `infrastructure`
  directory in project root.

  We export `SERVER_IMAGE` env variable which is used in Pulumi to create an ECS
  service with that image. Notice we're missing .env files. That is because we put
  all secrets in AWS SSM Parameter Store and we configured our Pulumi ECS service
  to pull the secrets from there.

  Pulumi needs to be configured so it outputs at least two variables:

    1. S3 bucket name where we will upload built frontend from job 1
    2. Cloudfront Distribution ID which we'll use to invalidate its cache


  Both variables are stored in `bash.env` file and that file is persisted to workspace
  because that is the easiest way of carrying those variables over to the next step.

### Job 4: Deploy Frontend

  This is the step where we upload the frontend dist files from job 1 to S3 bucket
  that was created in job 3.

  ```yaml
    deploy-frontend:
      working_directory: ~/app
      parameters:
        access_key:
          type: string
        secret_key:
          type: string
        region:
          type: string
      executor: base
      steps:
        - attach_workspace:
            at: .
        - aws-cli/setup:
            aws_access_key_id: << parameters.access_key >>
            aws_secret_access_key: << parameters.secret_key >>
            region: << parameters.region >>
        - run:
            name: Set environment variables
            command: cat bash.env >> $BASH_ENV
        - run:
            name: Deploy to S3
            command: |
              aws s3 sync dist s3://${S3_SITE_BUCKET} --no-progress --delete
              aws cloudfront create-invalidation --distribution-id ${CF_DISTRIBUTION_ID} --paths "/*"

  ```

### Workflow definition

  Workflow is used to orchestrate different jobs and configure job dependencies,
  for example: we need to wait for the infrastructure deployment before we can upload
  files to S3 (which is supposed to be created in that job).
  In this example we can see that we run this workflow only when the branch name is
  `develop`.

  ```yaml
    workflows:
      version: 2
      build-and-deploy-dev:
        when:
          and:
            - equal: [develop, << pipeline.git.branch >>]
        jobs:
          - build-frontend
          - build-server:
              <<: *studion-aws-credentials
              account_id: ${STUDION_AWS_ACCOUNT_ID}
              ecr_repo: app_server
          - deploy-aws:
              <<: *studion-aws-credentials
              account_id: ${STUDION_AWS_ACCOUNT_ID}
              ecr_repo: app_server
              stack: dev
              requires:
                - build-server
          - deploy-frontend:
              <<: *studion-aws-credentials
              requires:
                - build-frontend
                - deploy-aws
  ```

  Note that job params are set for each job and here we can use AWS credentials which
  we defined at the beginning of the file. We can also see that some jobs can run in
  parallel, for example: frontend and backend builds don't depend on each other and
  that is how we can speed up the build process.

### Workflow definition part 2

  In the previous steps we defined job parameters that allow us to
  easily build different environments, for example: staging.

  Everything remains the same, we just need to change some variables and we can
  easily deploy to as many environments as we want.

  ```yaml
    build-and-deploy-stage:
      when:
        and:
          - equal: [stage, << pipeline.git.branch >>]
      jobs:
        - build-frontend
        - build-server:
            <<: *client-aws-credentials
            account_id: ${CLIENT_AWS_ACCOUNT_ID}
            ecr_repo: app_server
        - deploy-aws:
            <<: *client-aws-credentials
            account_id: ${CLIENT_AWS_ACCOUNT_ID}
            ecr_repo: app_server
            stack: stage
            requires:
              - build-server
        - deploy-frontend:
            <<: *client-aws-credentials
            requires:
              - build-frontend
              - deploy-aws
  ```
