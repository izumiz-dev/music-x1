# CLI Rules for the Music-X1 Project

## Overview
This document defines the command-line interface (CLI) rules for the Music-X1 project.

## General Rules

1. All command-line utilities must be implemented using PowerShell.
2. Scripts must be compatible with both Windows and Linux environments to ensure proper functionality in GitHub Actions pipelines.
3. Cross-platform compatibility is mandatory for all CLI tools.
4. All specification changes must be documented in the architecture and readme files.
5. CLI tools may leverage network search capabilities using integrated search tools when necessary.

## Network Search Integration

### Available Search Tools
- **Perplexity Ask**: Use for detailed technical queries that require comprehensive answers.
- **Brave Search**: Use for general web searches related to troubleshooting, documentation, or reference materials.

### Usage Guidelines
- Network searches should be used when local documentation is insufficient.
- Search results must be cached when appropriate to minimize repeated network requests.
- Include proper error handling for scenarios where network connectivity is unavailable.
- Respect rate limits and implement appropriate backoff strategies.

## Cross-Platform Compatibility Guidelines

### File Paths
- Use `Join-Path` instead of string concatenation with backslashes or forward slashes:
  ```powershell
  $filePath = Join-Path -Path $directory -ChildPath $fileName
  ```

### Command Execution
- For external commands, use platform-agnostic approaches:
  ```powershell
  $isWindows = $PSVersionTable.PSVersion.ToString() -match "Windows"
  if ($isWindows) {
      # Windows-specific execution
  } else {
      # Linux-specific execution
  }
  ```

### Environment Variables
- Use `$env:VARIABLE_NAME` syntax consistently.
- Set environment variables in a way that works on both platforms:
  ```powershell
  if ($PSVersionTable.PSVersion.ToString() -match "Windows") {
      $env:PATH = "$someDir;$env:PATH"
  } else {
      $env:PATH = "$someDir:$env:PATH"
  }
  ```

### Line Endings
- Ensure scripts use LF line endings for Linux compatibility.
- Add `.gitattributes` with appropriate settings:
  ```
  *.ps1 text eol=lf
  ```

## Testing Requirements
- All CLI scripts must be tested in both Windows and Linux environments before deployment.
- Use Docker containers for Linux testing when developing on Windows.

## Documentation
- Each CLI command must include proper documentation with examples for both Windows and Linux usage.
- Help text must be available via `-Help` or `--help` parameters.

## Documentation Update Requirements

### Specification Changes
- All changes to functionality, features, or behaviors must be documented in both architecture documents and README files.
- Updates must be made in the following files when applicable:
  - `ARCHITECTURE.md` - For technical implementation details
  - `README.md` - For user-facing feature descriptions
  - `README_JA.md` - Japanese version of the README

### Documentation Process
- Documentation updates should be made in the same pull request as the code changes.
- Both English and Japanese documentation must be updated simultaneously.
- Architecture diagrams must be updated to reflect any workflow or structural changes.

### Version History
- Major feature additions or breaking changes must be documented in a version history section.
- Include dates, version numbers (if applicable), and brief descriptions of changes.

## Code Quality Requirements

### Mandatory Checks Before Completion
- All development work must pass lint and type checks before being considered complete.
- After completing any feature or fix, run the following commands to verify quality:
  ```powershell
  pnpm lint
  pnpm type-check
  ```
- CI/CD pipelines should include these checks as mandatory steps.
- Pull requests should not be merged until all lint and type-check issues are resolved.

### Fix Issues Immediately
- If lint or type-check commands report any issues, they must be fixed immediately before proceeding with other tasks.
- Use `pnpm lint:fix` to automatically fix common linting issues when possible.

### Code Review Process
- Reviewers should verify that all code has passed lint and type-check before approval.
- Code that introduces new lint warnings or type errors should be rejected in the review process.
