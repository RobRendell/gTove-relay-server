export default function singleton<T>(constructor: new () => T): T {
    return new constructor();
}