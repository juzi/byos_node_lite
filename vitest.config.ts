import {defineConfig} from 'vitest/config'
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        sequence: {
            concurrent: true,
        },
        env: {
            'SECRET_KEY': 'TEST_SECRET_KEY',
            'PUBLIC_URL_ORIGIN': 'TEST_PUBLIC_URL_ORIGIN',
        }
    },
})