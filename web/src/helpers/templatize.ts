export const renderString = (template: string, context: Record<string, string>): string => {
    return template.replace(/{{\s*(\w+)\s*}}/g, (match, variableName) => {
        // if the variable is not found, return the match. basically only replace vars that are in the context
        // otherwise keep it as is
        return context[variableName] || match;
    });
}