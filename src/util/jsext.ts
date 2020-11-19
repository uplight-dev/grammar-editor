export default {
    toMap: (k, v) => {
        const r = {};
        r[k] = v;
        return r;
    },

    toStr: (o) => {
        return JSON.stringify(o, null, 2);
    }
}
