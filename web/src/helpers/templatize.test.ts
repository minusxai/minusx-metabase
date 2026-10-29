import { renderString } from './templatize'

test('renders template with context variables', () => {
    const template = "Hello {{ name }}! Welcome to {{ place }}.";
    const context = { name: 'John', place: 'Stack Overflow' };
    const result = renderString(template, context);
    expect(result).toBe("Hello John! Welcome to Stack Overflow.");
});

test('handles missing context variables gracefully', () => {
    const template = "Hello {{ name }}! Welcome to {{ place }}.";
    const context = { name: 'John' };
    const result = renderString(template, context);
    expect(result).toBe("Hello John! Welcome to .");
})