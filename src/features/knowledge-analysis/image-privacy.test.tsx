import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { AnalysisMarkdown } from './AnalysisMarkdown';
import { safeAnalysisImage, safeAnalysisUrl } from './safeUrl';

afterEach(cleanup);
describe('knowledge analysis image privacy', () => {
  it('allows only reviewed static bank images, without query strings or traversal', () => {
    expect(safeAnalysisImage('/bank-figures/geometry-1.svg')).toBe('/bank-figures/geometry-1.svg');
    expect(safeAnalysisImage('/bank-figures/chapter-1/figure_2.png')).toBe('/bank-figures/chapter-1/figure_2.png');
    for (const url of [
      'https://example.com/pixel?answer=private', '//example.com/pixel.png',
      '/api/v1/private-image', '/bank-figures/../../api/private.svg',
      '/bank-figures/%2e%2e/private.svg', '/bank-figures/%252e%252e/private.svg',
      '/bank-figures/figure.svg?answer=private', '/bank-figures/figure.svg#private',
      '/bank-figures/figure\\private.svg', 'data:image/svg+xml,x', '#figure',
    ]) expect(safeAnalysisImage(url)).toBeUndefined();
  });
  it('does not load generated remote images while leaving explicit safe links clickable', () => {
    const { container } = render(<AnalysisMarkdown text={'![remote](https://example.com/pixel?answer=private)\n\n![reviewed](/bank-figures/figure.svg)\n\n[reference](https://example.com/reference)'} />);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/bank-figures/figure.svg');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com/reference');
    expect(safeAnalysisUrl('https://example.com/reference')).toBe('https://example.com/reference');
  });
});
