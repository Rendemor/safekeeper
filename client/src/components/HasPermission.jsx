import { useCryptoStore } from "../utils/store"

// проверка прав
export const HasPermission = ({ permission, children }) => {
    // достаём права
    const permissions = useCryptoStore((state) => state.permissions) || []

    // проверяем наличие права
    if (!permissions.includes(permission)) {
        return null
    }

    // если право есть, то просто отдаём сам компонент, который был завёрнут в проверку прав
    return <>{children}</>
}