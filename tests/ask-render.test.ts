import { describe, expect, it } from 'vitest';
import { render, split } from '../src/scripts/ask';

describe("JohnLM's answer renderer", () => {
  it('escapes HTML in answers', () => {
    const html = render('<img src=x onerror="alert(1)"> and <script>alert(1)</script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;img');
  });

  it('links only http(s) and site paths', () => {
    expect(render('[ok](https://johnetokhana.com)')).toContain('href="https://johnetokhana.com"');
    expect(render('[rivva](/work/rivva/)')).toContain('href="/work/rivva/"');
    expect(render('[bad](javascript:alert(1))')).not.toContain('href="javascript');
  });

  it('renders lists, bold and the email address', () => {
    const html = render('**Two** things:\n\n- one\n- two\n\nEmail etokhanaj@gmail.com');
    expect(html).toContain('<strong>Two</strong>');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(html).toContain('href="mailto:etokhanaj@gmail.com"');
  });

  it('leaves an email address inside a link alone', () => {
    const html = render('[x](https://example.com/(a@b.co) and c@d.co');
    expect(html).toContain('<a href="https://example.com/(a@b.co" target="_blank" rel="noopener">x</a>');
    expect(html).toContain('<a href="mailto:c@d.co">c@d.co</a>');
  });

  it('pulls out follow-ups and hides one still streaming in', () => {
    const done = split('Answer.\n[[follow-up: First?]]\n[[follow-up: Second?]]');
    expect(done.follow).toEqual(['First?', 'Second?']);
    expect(done.body.trim()).toBe('Answer.');
    expect(split('Answer.\n[[follow-up: Hal').body.trim()).toBe('Answer.');
  });
});
