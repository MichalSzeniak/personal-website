// The e-mail address never appears in the HTML: both parts are stored reversed and
// base64-encoded in data-u and data-d, and a script assembles the address in the browser.

export const encodeEmailPart = (part: string) => btoa([...part].reverse().join(''));

const decode = (value = '') => [...atob(value)].reverse().join('');

export const decodeEmail = (data: DOMStringMap) => `${decode(data.u)}@${decode(data.d)}`;
