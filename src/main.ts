import * as core from "@actions/core";
import {
  Backport,
  Config,
  experimentalDefaults,
  deprecatedExperimental,
} from "./backport";
import { Github } from "./github";
import { Git } from "./git";
import { execa } from "execa";
import dedent from "dedent";

/**
 * Called from the action.yml.
 *
 * Is separated from backport for testing purposes
 */
async function run(): Promise<void> {
  const token = core.getInput("github_token", { required: true });
  const pwd = core.getInput("github_workspace", { required: true });
  const pattern = core.getInput("label_pattern");
  const description = core.getInput("pull_description");
  const title = core.getInput("pull_title");
  const branch_name = core.getInput("branch_name");
  const copy_labels_pattern = core.getInput("copy_labels_pattern");
  const target_branches = core.getInput("target_branches");
  const cherry_picking = core.getInput("cherry_picking");
  const merge_commits = core.getInput("merge_commits");
  const copy_assignees = core.getInput("copy_assignees");
  const copy_milestone = core.getInput("copy_milestone");
  const copy_requested_reviewers = core.getInput("copy_requested_reviewers");
  const experimental = JSON.parse(core.getInput("experimental"));
  const pull_number = core.getInput("pull_number");

  if (cherry_picking !== "auto" && cherry_picking !== "pull_request_head") {
    const message = `Expected input 'cherry_picking' to be either 'auto' or 'pull_request_head', but was '${cherry_picking}'`;
    console.error(message);
    core.setFailed(message);
    return;
  }

  if (merge_commits != "fail" && merge_commits != "skip") {
    const message = `Expected input 'merge_commits' to be either 'fail' or 'skip', but was '${merge_commits}'`;
    console.error(message);
    core.setFailed(message);
    return;
  }

  for (const key in experimental) {
    if (!(key in experimentalDefaults)) {
      console.warn(dedent`Encountered unexpected key in input 'experimental'.\
        No experimental config options known for key '${key}'.\
        Please check the documentation for details about experimental features.`);
    }

    if (key in deprecatedExperimental) {
      console.warn(dedent`Encountered deprecated key in input 'experimental'.\
        Key '${key}' is no longer used. You should remove it from your workflow.\
        Please check the release notes or the documentation for more details.`);
    }

    if (key == "conflict_resolution") {
      if (
        experimental[key] !== "fail" &&
        experimental[key] !== "draft_commit_conflicts"
      ) {
        const message = `Expected input 'conflict_resolution' to be either 'fail' or 'draft_commit_conflicts', but was '${experimental[key]}'`;
        console.error(message);
        core.setFailed(message);
        return;
      }
    }
  }

  const github = new Github(token);
  const git = new Git(execa);
  const config: Config = {
    pwd,
    labels: { pattern: pattern === "" ? undefined : new RegExp(pattern) },
    pull: { description, title, branch_name },
    copy_labels_pattern:
      copy_labels_pattern === "" ? undefined : new RegExp(copy_labels_pattern),
    target_branches: target_branches === "" ? undefined : target_branches,
    commits: { cherry_picking, merge_commits },
    copy_assignees: copy_assignees === "true",
    copy_milestone: copy_milestone === "true",
    copy_requested_reviewers: copy_requested_reviewers === "true",
    experimental: { ...experimentalDefaults, ...experimental },
    pull_number: pull_number === "" ? 0 : +pull_number,
  };
  const backport = new Backport(github, config, git);

  return backport.run();
}

// this would be executed on import in a test file
run();
