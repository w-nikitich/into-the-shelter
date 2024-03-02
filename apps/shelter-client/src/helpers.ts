import Cookies from 'js-cookie';

class CookieHelper {
    saveCookie(key: string, value: string): void {
        Cookies.set(key, value);
    }

    setCookieWithMaxAge = (key: string, value: string, maxAge: number) => {
        document.cookie = `${key}=${value}; max-age=${maxAge}; path=/`;
    };

    updateCookie(key: string, newValue: string): void {
        const currentValue = this.getCookie(key);
        if (currentValue !== undefined) {
            this.saveCookie(key, newValue);
        }
    }

    getCookie(key: string): string | undefined {
        return Cookies.get(key);
    }

    removeCookie(key: string): void {
        return Cookies.remove(key);
    }

    removeAllCookies(): void {
        const allCookies = Cookies.get();
        Object.keys(allCookies).forEach((cookieName) => {
            this.removeCookie(cookieName);
        });
    }

    getAllCookies(): Record<string, string> {
        return Cookies.get();
    }
}
export const cookieHelper = new CookieHelper();


/**
 * Return deshes instead of input string.
 * Example: halo -> ----
 */
export const deshCount = (string: string) => {
    const length: number = string.split('').length
    const dashArr: string[] = []
    for (let i = 0; i < length; i++) {
        dashArr.push('-')
    }
    return dashArr.join('')
}

export const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, func: Function) => {
    if (e.key === 'Enter') {
        func()
    }
}

export const gameAvatarByPosition = (gameAvatars: any, position: number) => {
    try {
        const avatarObj = gameAvatars?.find((elem: { metadata: { position: number; }; }) => elem.metadata.position === position) || null
        return avatarObj
    } catch {
        return null
    }
}

export const fillGameAvatars = (gameAvatars: any) => {
    // filter before use
    gameAvatars = gameAvatars.filter((avatarObj: { downloadUrl: string; }) => avatarObj.downloadUrl !== 'default')

    const arr = []
    const index = gameAvatars.length === 0 ? 3 : 4
    for (let i = 0; i < index - gameAvatars.length; i++) {
        arr.push({ downloadUrl: 'default', metadata: { position: 0 }, fileId: 0 })
    }
    return [...arr, ...gameAvatars]
}