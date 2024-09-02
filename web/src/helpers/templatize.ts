export const renderString = (template: string, context: Record<string, string>): string => {
    return template.replace(/{{\s*(\w+)\s*}}/g, (match, variableName) => {
        return context[variableName] || '';
    });
}