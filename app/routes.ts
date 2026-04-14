import {type RouteConfig, index, route} from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route('/auth', 'routes/auth.tsx'),
    route('/upload', 'routes/upload.tsx'),
    route('/resume/:id', 'routes/resume.tsx'),
    route('/wipe', 'routes/wipe.tsx'),
    // Chrome sometimes probes this URL during local dev; handle it to avoid noisy "No route matches" SSR logs.
    route('/.well-known/appspecific/com.chrome.devtools.json', 'routes/chrome-devtools.tsx'),
] satisfies RouteConfig;
