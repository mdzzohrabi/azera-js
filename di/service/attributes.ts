import { createAttribute } from "@azera/reflect";

export const Inject = createAttribute((service?: any) => ({ service }), { key: 'di:inject' });