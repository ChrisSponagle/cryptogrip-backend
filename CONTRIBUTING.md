# Git flow

## Introduction

The repository has an ongoing working branch called `dev`. 
As a developer, you will be branching from and merging to `dev`. 
Every branch should solve ***only a single task***. 
After pushing your changes to remote branch, please create a Merge Request to `dev`.

## Branch structure

During the development process, we will follow this structure:

 - #### Master :
   Created : never.<br>
   Current live branch. Can only be updated by merge.
 
 
 - #### Dev :
   Created : never.<br>
   Dev is the development branch. can also only be updated by merge.
   
   
 - #### Feature :
   Created : from dev<br>
   Merged : Via MR ( merge request ) into dev
   
    > Feature is pulled from the dev branch and when done is merge back top dev using merge request.
   Each feature respond to an issue ticket. 
   The naming should be the one generated by gitlab from the issue name when creating the branch.
   
    > Ex : `feature/2-install-netflix` or `feature/install-netflix` where Gitlab task name is Install Netflix
   
   
 - #### Hotfix :
   Created : from master<br>
   Merged : master, release, development
   
    > Hotfix solve the problem of urgent issue that need to be fixed on the master branch. 
   It need to be merged back to release and prepro since we want this hotfix to be part of the final code
   The naming should be the one generated by gitlab from the issue name when creating the branch.
   
    > Ex : `hotfix/2-install-netflix` or `hotfix/install-netflix` where Gitlab task name is Install Netflix
   
   
 - #### Bugfix :
   Created : from dev<br>
   Merged : master, release, dev
   
    > Bugfix covers the bugs discovered after merging a feature branch in the dev branch. It allow us to intervene on those new feature before deploying.
   
    > Ex : `bug/2-install-netflix` or `bug/install-netflix` where Gitlab task name is Install Netflix

## Branch naming

Branch names should comply with the following pattern: `type/description-of-task`, where type can be either `hotfix`, `bugfix`, `feature`.

## Merge Request (MR)

Every MR needs the following information:
- _Title_. A short and concise description of the task

- _Description_. A more detailed information about the task (optional). You can add `#ISSUE_NUMBER` here to refer to a specific issue.

If a feature is too large or complex, it can be divided to subtasks. In such case, one parent branch will be created, and all subtasks will branch off from it. When subtasks are done, MR is created and it is merged to parent branch. And finally, when all subtasks are merged to parent, there will be a final MR from parent branch to `dev`.

### Example

Let's say, you have an `Info screen` issue. As an example, we can divide it to following 5 subtasks:

1. Entity + API
2. IssueRepository
3. IssueInteractor
4. IssueInfoPresenter and IssueInfoView
5. IssueInfoFragment and layout

Recommended Git Flow:

1. Create a parent remote branch `feature/issue_info_screen` (branch off from `dev`)
2. Create a new branch to solve the first task (`feature/issue_info_entity_and_api`, branch off from parent)
3. Do you changes, commit and push
4. Create a MR for the subtask (from ``feature/issue_info_entity_and_api`` to `feature/issue_info_screen`)
5. Repeat steps 2-4 for all remaining subtasks
6. Finally, create a MR from parent `feature/issue_info_screen` to `dev`

***Don't forget to resolve the conflicts***
