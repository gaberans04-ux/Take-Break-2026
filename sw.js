const CACHE_NAME = 'takebreak-cache-v3';

// الملفات الأساسية للتطبيق التي يتم تخزينها مؤقتاً لسرعة التحميل
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap'
];

// مرحلة التثبيت: حفظ الملفات الثابتة
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// مرحلة التفعيل: حذف الكاش القديم عند نزول أي تحديث جديد
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// استراتيجية جلب البيانات (Network First for Sheets / Cache First for Static):
// 1. روابط Google Sheets (المنيو): يتم جلبها دائماً عبر الإنترنت أولاً للحصول على أحدث الأسعار، وإذا تعذر الاتصال يتم استخدام آخر نسخة كاش.
// 2. باقي الملفات والصور: يتم جلبها من الكاش مباشرة لتجربة تصفح سريعة وفورية.
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // إذا كان الطلب لرابط شيت المنيو
  if (requestUrl.hostname.includes('docs.google.com') || requestUrl.hostname.includes('googleusercontent.com')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // لباقي ملفات التطبيق والصور
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
