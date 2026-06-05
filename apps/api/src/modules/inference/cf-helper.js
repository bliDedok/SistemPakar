export function clampCf(value) {
    if (!Number.isFinite(value))
        return 0;
    return Math.max(0, Math.min(1, value));
}
export function calculateCfExpert(mb, md) {
    return clampCf(mb - md);
}
export function calculateCfPartial(cfExpert, cfUser) {
    return clampCf(cfExpert) * clampCf(cfUser);
}
export function combineCfValues(values) {
    return clampCf(values
        .filter((value) => Number.isFinite(value) && value > 0)
        .reduce((combined, current) => {
        return combined + current * (1 - combined);
    }, 0));
}
