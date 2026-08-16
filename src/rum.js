import { datadogRum } from '@datadog/browser-rum';
import { reactPlugin } from '@datadog/browser-rum-react';

const applicationId = import.meta.env.VITE_DD_APPLICATION_ID;
const clientToken = import.meta.env.VITE_DD_CLIENT_TOKEN;

if (applicationId && clientToken) {
    datadogRum.init({
        applicationId,
        clientToken,
        site: 'datadoghq.eu',
        service: 'mirror-website',
        env: import.meta.env.VITE_DD_ENV || import.meta.env.MODE,
        version: __APP_VERSION__,
        sessionSampleRate: 100,
        sessionReplaySampleRate: 20,
        trackResources: true,
        trackUserInteractions: true,
        trackLongTasks: true,
        plugins: [reactPlugin({ router: false })],
    });
}
