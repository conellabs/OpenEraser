import { describe, expect, it } from 'vitest';
import { injectData } from '../scripts/make-artifact.js';

const TPL = '<script id="oe-data" type="application/json">__OPEN_ERASER_DATA__</script>';

describe('injectData', () => {
  it('round-trips diagrams through the embedded JSON', () => {
    const diagrams = [{ name: 'Overview', mermaid: 'graph TB\n  A[One] --> B[Two]' }];
    const html = injectData(TPL, 'My Project', diagrams);
    const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));
    expect(JSON.parse(json)).toEqual({ title: 'My Project', diagrams });
  });

  it('escapes </script> sequences so the data cannot terminate the tag', () => {
    const diagrams = [{ name: 'x', mermaid: 'graph TB\n  A["</script><script>alert(1)"] --> B[y]' }];
    const html = injectData(TPL, 't', diagrams);
    // The only </script> left is the template's own closing tag.
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));
    expect(JSON.parse(json).diagrams[0].mermaid).toContain('</script>');
  });

  it('treats $-sequences in diagram text literally', () => {
    const diagrams = [{ name: 'x', mermaid: 'graph TB\n  A[Costs $& more $1] --> B[y]' }];
    const html = injectData(TPL, 't', diagrams);
    expect(html).toContain('Costs $& more $1');
  });

  it('rejects templates without the placeholder', () => {
    expect(() => injectData('<html></html>', 't', [])).toThrow(/placeholder/);
  });
});
