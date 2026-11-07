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

## Scope

Useful reports include:

- Markup or script injection in rendered SVG or HTML artifacts
- Artifact data escaping failures
- Unexpected filesystem or network access during rendering
- Parser or layout inputs that cause severe resource exhaustion
- Dependency vulnerabilities that affect normal use

Open Eraser is not a sandbox for arbitrary JavaScript or custom SVG. The
README's Security section describes what the renderer enforces. Reports
showing a bypass of any of those guarantees are welcome.

## Supported versions

While Open Eraser is `0.x`, only the latest published version receives
security fixes.
