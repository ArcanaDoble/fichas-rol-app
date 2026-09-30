// Older ability copies appended structured fields to the end of their rules.
// Keep those fields available separately without rewriting the actual effect.
export const getItemRulesPresentation = (item = {}, descriptionOverride) => {
    const source = { ...(item.payload || {}), ...item };
    const firstValue = (...values) => values.find(value => Array.isArray(value) ? value.length > 0 : String(value || '').trim()) || '';
    let description = String(descriptionOverride ?? firstValue(source.rulesDescription, source.descripcionReglas,
        source.detail, source.description, source.descripcion)).trim();
    const suffix = description.match(/(?:\s|^)(?:[•·]\s*)?Alcance:\s*([^\n•·]+?)\s*[•·]\s*Rasgos:\s*([^\n]+)\s*$/i);
    let range = source.range || source.alcance || '';
    let traits = firstValue(source.traits, source.rasgos, source.trait);
    if (suffix) {
        description = description.slice(0, suffix.index).trim();
        range = range || suffix[1].trim();
        traits = traits || suffix[2].trim().replace(/\.$/, '');
    }
    return {
        description,
        range,
        traits: (Array.isArray(traits) ? traits : String(traits).split(/[,;•·]/)).map(value => String(value).trim()).filter(Boolean),
    };
};
