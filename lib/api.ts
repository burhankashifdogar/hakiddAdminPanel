function normalizeApiBase(value?: string) {
  const fallback = 'http://127.0.0.1:3001/api';
  const sanitized = (value ?? fallback)
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\/+$/g, '');

  try {
    return new URL(sanitized).toString().replace(/\/+$/g, '');
  } catch {
    return fallback;
  }
}

function buildApiUrl(path: string) {
  const base = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE_URL);
  const normalizedPath = path.replace(/^\/+/, '');
  return `${base}/${normalizedPath}`;
}

function getErrorMessage(payload: unknown, fallback: string) {
  const record = payload as Record<string, unknown> | null | undefined;

  if (Array.isArray(record?.message)) {
    return record.message.join(', ');
  }

  if (typeof record?.message === 'string' && record.message.trim() !== '') {
    return record.message;
  }

  if (typeof record?.error === 'string' && record.error.trim() !== '') {
    return record.error;
  }

  return fallback;
}

async function readPayload(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export type AdminListResponse = {
  data: Record<string, unknown>[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
};

export async function adminLogin(email: string, password: string) {
  const response = await fetch(buildApiUrl('/admin-api/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Login failed'));
  }

  return payload;
}

export async function adminGet(path: string, token: string) {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Request failed'));
  }

  return payload;
}

export async function adminPost(path: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Request failed'));
  }

  return payload;
}

export async function adminDownload(path: string, token: string) {
  const response = await fetch(buildApiUrl(path), {
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await readPayload(response);
    throw new Error(getErrorMessage(payload, 'Download failed'));
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/i);

  return {
    blob: await response.blob(),
    filename: match?.[1] ?? 'download',
  };
}

export async function adminPut(path: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(buildApiUrl(path), {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Request failed'));
  }

  return payload;
}

export async function adminDelete(path: string, token: string) {
  const response = await fetch(buildApiUrl(path), {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Request failed'));
  }

  return payload;
}

export async function adminPostForm(path: string, token: string, body: FormData) {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
    },
    body,
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Request failed'));
  }

  return payload;
}

export function adminPostFormWithProgress(
  path: string,
  token: string,
  body: FormData,
  onProgress: (percent: number) => void,
) {
  return new Promise<unknown>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', buildApiUrl(path), true);
    request.setRequestHeader('authorization', `Bearer ${token}`);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      const text = request.responseText ?? '';
      let payload: unknown = {};

      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { message: text };
        }
      }

      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve(payload);
        return;
      }

      reject(new Error(getErrorMessage(payload, 'Request failed')));
    };

    request.onerror = () => reject(new Error('Network error. Please try again.'));
    request.send(body);
  });
}

export async function publicGet(path: string) {
  const response = await fetch(buildApiUrl(path), {
    cache: 'no-store',
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Request failed'));
  }

  return payload;
}

export function getApiBaseUrl() {
  return normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE_URL);
}
