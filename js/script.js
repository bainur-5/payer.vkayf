document.addEventListener("DOMContentLoaded", () => {
  const $LoginBlock = document.getElementById("LoginBlock");
  const $video = document.getElementById("video");
  const player = new shaka.Player($video);
  const userAgent = navigator.userAgent.toLowerCase();

  checkAuthorization();
  executeRequests();
  checkBrowser();

  async function checkAuthorization() {
    const accessToken = getCookie("access_token");
    if (!accessToken) {
      console.log(accessToken);
      showLoginForm();
      return;
    }

    try {
      const apiUrl = "https://api.vkayf.tv/vkayf/v1/auth/token";
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;

        if (newAccessToken && newRefreshToken) {
          setCookie("access_token", newAccessToken);
          setCookie("refresh_token", newRefreshToken);
        }
      } else {
        showLoginForm();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      showLoginForm();
    }
  }
  function showLoginForm() {
    $LoginBlock.innerHTML = `        
    <div class="logo_block">
      <img
        src="https://vkayf.tv/wp-content/uploads/2024/04/logo_mini.svg"
        alt=""
      />
      <div class="title_log">
        <div class="line"></div>
        <div class="line_text"><p>Войдите в свой аккаунт</p></div>
        <div class="line"></div>
      </div>
      <div class="title_text">
        <p>Добро пожаловать! Пожалуйста, введите свои данные.</p>
      </div>
    </div>
    <form id="loginForm" class="loginForm">
      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        placeholder="Ведите электронную почту"
        required
      />
      <br />
      <label for="password">Пароль</label>
      <input
        type="password"
        id="password"
        placeholder="Ведите пароль"
        required
      />
      <br />
      <button type="submit">ВОЙТИ</button>
    </form>
        `;
    document
      .getElementById("loginForm")
      .addEventListener("submit", function (event) {
        event.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        authorize(email, password)
          .then(() => {
            console.log("Авторизация успешна");
            executeRequests();
          })
          .catch((error) => {
            console.error("Ошибка при авторизации:", error);
          });
      });
  }

  async function authorize(email, password) {
    const basicAuth = btoa(`${email}:${password}`);
    const apiUrl = "https://api.vkayf.tv/vkayf/v1/auth/authorize";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setCookie("access_token", data.access_token);
      setCookie('refresh_token', data.refresh_token);
    } else {
      throw new Error("Ошибка авторизации");
    }
  }

  function getCookie(name) {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }
  function showAlert(message) {
    alert(message);
  }
  function checkBrowser(){
    if (userAgent.includes("iphone")) {
      showAlert(
        "Ошибка: Вы используете iPhone. Пожалуйста, используйте другое устройство для доступа."
      );
    } else if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
      showAlert(
        "Внимание: Вы используете Safari. Для лучшей совместимости рекомендуем использовать другой браузер."
      );
    } else if (userAgent.includes("chrome")) {
      const chromeVersion = parseInt(userAgent.match(/chrome\/(\d+)/)[1], 10);
      if (chromeVersion < 90) {
        showAlert(
          "Внимание: Ваша версия Chrome устарела. Рекомендуем обновиться для получения последних функций и безопасности."
        );
      }
    } else {
      showAlert(
        "Внимание: Ваш браузер не поддерживается или его тип неизвестен. Рекомендуем обновиться или использовать другой браузер для лучшей совместимости."
      );
    }
  }

  async function fetchData(url, accessToken) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }
    return await response.json();
  }

  async function executeRequests() {
    try {
      const accessToken = getCookie("access_token");
      if (!accessToken) {
        showLoginForm();
        return;
      }

      const login = "t9260119001@gmail.com";
      const contentId = "IDLUINODRM";

      const urlResponse = await fetchData(
        `https://api.vkayf.tv/vkayf/v1/drm/play?login=${login}&contentId=${contentId}`,
        accessToken
      );
      const checkResponse = await fetchData(
        `https://api.vkayf.tv/vkayf/v1/drm/check?login=${login}&contentId=${contentId}`,
        accessToken
      );

      if (checkResponse.error && checkResponse.error === "no-rights") {
        showAlert(
          "Кажется у вас нет доступа к этому контенту, пожалуйста проверьте ссылку или напишите на support@vkayf.tv"
        );
      } else {
        const { widevineUrl, playreadyUrl } = checkResponse; // Ensure HTTPS

        console.log("URL для воспроизведения:", urlResponse);
        console.log("Widevine URL:", widevineUrl);
        console.log("PlayReady URL:", playreadyUrl);

        // DRM and manifest configuration
        const drmConfig = {
          servers: {
            "com.widevine.alpha": widevineUrl,
            "com.microsoft.playready": playreadyUrl,
          },
        };

        player.configure({
          drm: drmConfig,
        });

        try {
          await player.load(urlResponse);
          console.log("Видео уже загружено!");
        } catch (e) {
          console.error("Ошибка загруски видео", e);
        }
      }
    } catch (error) {
      console.error("Ошибка при выполнении запросов:", error);
    }
  }
});
