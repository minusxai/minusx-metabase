import { renderString } from './templatize'

test('renders template with context variables', () => {
    const template = "Hello {{ name }}! Welcome to {{ place }}.";
    const context = { name: 'John', place: 'Stack Overflow' };
    const result = renderString(template, context);
    expect(result).toBe("Hello John! Welcome to Stack Overflow.");
});

test('preserves placeholders for missing context variables', () => {
    const template = "Hello {{ name }}! Welcome to {{ place }}.";
    const context = { name: 'John' };
    const result = renderString(template, context);
    expect(result).toBe("Hello John! Welcome to {{ place }}.");
})