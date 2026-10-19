/**
 * Cloudflare Pages Function in Advanced Mode.
 *
 * - Phục vụ toàn bộ file tĩnh trong thư mục public.
 * - Nhận POST /api/register.
 * - Chuyển dữ liệu sang Google Apps Script bằng khóa bí mật.
 */

const JSON_HEADERS = {
  'Content-Type':
    'application/json; charset=UTF-8',

  'Cache-Control':
    'no-store'
};

const ALLOWED_DEMOS =
  new Set([
    'leave',
    'time',
    'meeting',
    'overtime'
  ]);

export default {
  async fetch(
    request,
    env
  ) {
    const url =
      new URL(
        request.url
      );

    if (
      url.pathname ===
      '/api/register'
    ) {
      return handleRegistrationApi(
        request,
        env,
        url
      );
    }

    /*
     * Giữ tương thích với các link Apps Script cũ.
     */
    if (
      request.method === 'GET' &&
      url.pathname === '/'
    ) {
      const oldPage =
        String(
          url.searchParams.get(
            'page'
          ) || ''
        )
          .toLowerCase();

      if (oldPage === 'register') {
        return Response.redirect(
          new URL(
            '/register/',
            url
          ),
          301
        );
      }

      if (oldPage === 'demo') {
        const demoType =
          String(
            url.searchParams.get(
              'type'
            ) || 'leave'
          )
            .toLowerCase();

        const safeDemoType =
          ALLOWED_DEMOS.has(
            demoType
          )
            ? demoType
            : 'leave';

        return Response.redirect(
          new URL(
            '/demo/' +
            safeDemoType +
            '/',
            url
          ),
          301
        );
      }
    }

    if (
      request.method !== 'GET' &&
      request.method !== 'HEAD'
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            'Phương thức không được hỗ trợ.'
        },
        405,
        {
          'Allow':
            'GET, HEAD, POST'
        }
      );
    }

    const assetResponse =
      await env.ASSETS.fetch(
        request
      );

    return addSecurityHeaders(
      assetResponse
    );
  }
};


/**
 * Nhận dữ liệu đăng ký từ trình duyệt.
 */
async function handleRegistrationApi(
  request,
  env,
  url
) {
  if (request.method !== 'POST') {
    return jsonResponse(
      {
        success: false,
        message:
          'Chỉ chấp nhận phương thức POST.'
      },
      405,
      {
        'Allow':
          'POST'
      }
    );
  }

  const origin =
    request.headers.get(
      'Origin'
    );

  /*
   * Trình duyệt của chính website sẽ gửi Origin trùng với URL hiện tại.
   * Cho phép thiếu Origin để vẫn có thể kiểm thử bằng công cụ máy chủ.
   */
  if (
    origin &&
    origin !== url.origin
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          'Nguồn gửi yêu cầu không hợp lệ.'
      },
      403
    );
  }

  const contentType =
    request.headers.get(
      'Content-Type'
    ) || '';

  if (
    !contentType
      .toLowerCase()
      .includes(
        'application/json'
      )
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          'Định dạng dữ liệu không được hỗ trợ.'
      },
      415
    );
  }

  const contentLength =
    Number(
      request.headers.get(
        'Content-Length'
      ) || 0
    );

  if (
    contentLength >
    20000
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          'Dữ liệu gửi lên vượt quá giới hạn.'
      },
      413
    );
  }

  if (
    !env.APPS_SCRIPT_URL ||
    !env.APPS_SCRIPT_API_KEY
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          'Máy chủ chưa được cấu hình đầy đủ.'
      },
      500
    );
  }

  let formData;

  try {
    formData =
      await request.json();

  } catch (error) {
    return jsonResponse(
      {
        success: false,
        message:
          'Nội dung JSON không hợp lệ.'
      },
      400
    );
  }

  if (
    !isPlainObject(
      formData
    )
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          'Dữ liệu biểu mẫu không hợp lệ.'
      },
      400
    );
  }

  /*
   * Kiểm tra sơ bộ trước khi gửi đến Apps Script.
   * Việc kiểm tra chính thức vẫn nằm trong Code.gs.
   */
  if (
    String(
      formData.fullName || ''
    ).length > 120 ||
    String(
      formData.phone || ''
    ).length > 30 ||
    String(
      formData.email || ''
    ).length > 180 ||
    String(
      formData.transferContent || ''
    ).length > 80
  ) {
    return jsonResponse(
      {
        success: false,
        message:
          'Một hoặc nhiều trường dữ liệu vượt quá giới hạn.'
      },
      400
    );
  }

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      function () {
        controller.abort();
      },
      28000
    );

  try {
    const appsScriptResponse =
      await fetch(
        env.APPS_SCRIPT_URL,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json; charset=UTF-8',

            'Accept':
              'application/json'
          },

          redirect:
            'follow',

          signal:
            controller.signal,

          body:
            JSON.stringify({
              action:
                'register',

              apiKey:
                env.APPS_SCRIPT_API_KEY,

              data:
                formData
            })
        }
      );

    const responseText =
      await appsScriptResponse.text();

    let responseData;

    try {
      responseData =
        JSON.parse(
          responseText
        );

    } catch (error) {
      console.error(
        'Apps Script did not return JSON:',
        responseText.slice(
          0,
          500
        )
      );

      return jsonResponse(
        {
          success: false,
          message:
            'Google Apps Script trả về dữ liệu không hợp lệ. ' +
            'Hãy kiểm tra URL deployment và quyền truy cập.'
        },
        502
      );
    }

    /*
     * Apps Script ContentService thường trả HTTP 200 kể cả khi
     * nghiệp vụ trả success: false. Giữ nguyên cấu trúc để giao diện
     * hiển thị đúng lỗi trùng, hệ thống bận hoặc dữ liệu không hợp lệ.
     */
    return jsonResponse(
      responseData,
      appsScriptResponse.ok
        ? 200
        : 502
    );

  } catch (error) {
    const timedOut =
      error &&
      error.name ===
        'AbortError';

    console.error(
      'Registration proxy error:',
      error
    );

    return jsonResponse(
      {
        success: false,
        message:
          timedOut
            ? 'Google Apps Script phản hồi quá lâu. Vui lòng thử lại.'
            : 'Không thể kết nối Google Apps Script. Vui lòng thử lại.'
      },
      timedOut
        ? 504
        : 502
    );

  } finally {
    clearTimeout(
      timeoutId
    );
  }
}


function isPlainObject(
  value
) {
  return (
    value !== null &&
    typeof value ===
      'object' &&
    !Array.isArray(
      value
    )
  );
}


function jsonResponse(
  value,
  status,
  extraHeaders
) {
  const headers =
    new Headers(
      JSON_HEADERS
    );

  Object.entries(
    extraHeaders || {}
  )
    .forEach(
      function (
        entry
      ) {
        headers.set(
          entry[0],
          entry[1]
        );
      }
    );

  return new Response(
    JSON.stringify(
      value
    ),
    {
      status:
        status || 200,

      headers:
        headers
    }
  );
}


/**
 * Thêm các header an toàn cho file tĩnh.
 */
function addSecurityHeaders(
  response
) {
  const headers =
    new Headers(
      response.headers
    );

  headers.set(
    'X-Content-Type-Options',
    'nosniff'
  );

  headers.set(
    'Referrer-Policy',
    'strict-origin-when-cross-origin'
  );

  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  headers.set(
    'Cross-Origin-Opener-Policy',
    'same-origin'
  );

  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://img.vietqr.io",
      "connect-src 'self' https://img.vietqr.io",
      "font-src 'self' data:"
    ].join(
      '; '
    )
  );

  return new Response(
    response.body,
    {
      status:
        response.status,

      statusText:
        response.statusText,

      headers:
        headers
    }
  );
}
