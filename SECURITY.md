# Security policy

## Reporting a vulnerability

Please do not report suspected vulnerabilities in a public issue.

Use the repository's **Security → Report a vulnerability** action to send a
private GitHub security advisory to the maintainers. Include:

- Affected version or commit
- The input and API used
- Expected and observed behavior
- Reproduction steps or a minimal proof of concept
- The impact you believe is possible

If private vulnerability reporting is not visible, contact the repository
maintainers privately through the owning GitHub organization and avoid
including exploit details in a public message.

Maintainers should enable GitHub private vulnerability reporting before making
the repository public.

## Scope

Useful reports include:

- Markup or script injection in rendered SVG or HTML artifacts
- Artifact data escaping failures
- Unexpected filesystem or network access during rendering
- Parser or layout inputs that cause severe resource exhaustion
- Dependency vulnerabilities that affect normal use

Open Eraser is not a sandbox for arbitrary JavaScript, custom SVG, or
unvalidated custom theme objects. Reports showing a boundary bypass or an
unsafe documented default are still welcome.

## Supported versions

Until the first public release, only the latest commit on `main` is supported.
A version-support table will be added when stable public releases exist.
