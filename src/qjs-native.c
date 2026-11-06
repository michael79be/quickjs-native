#include "quickjs.h"
#include "stdint.h"

#ifdef _WIN32
#include <windows.h>
#else
#include <dlfcn.h>
#endif

#ifndef countof
#define countof(x) (sizeof(x) / sizeof((x)[0]))
#endif

typedef uint64_t (*ffi_fn0)(void);
typedef uint64_t (*ffi_fn1)(uint64_t);
typedef uint64_t (*ffi_fn2)(uint64_t, uint64_t);
typedef uint64_t (*ffi_fn3)(uint64_t, uint64_t, uint64_t);
typedef uint64_t (*ffi_fn4)(uint64_t, uint64_t, uint64_t, uint64_t);
typedef uint64_t (*ffi_fn5)(uint64_t, uint64_t, uint64_t, uint64_t, uint64_t);
typedef uint64_t (*ffi_fn6)(uint64_t, uint64_t, uint64_t, uint64_t, uint64_t, uint64_t);

static JSValue js_native_dlopen(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc < 1) return JS_ThrowTypeError(ctx, "Filename required");
    const char *filename = JS_ToCString(ctx, argv[0]);
    if (!filename) return JS_EXCEPTION;
#ifdef _WIN32
    HMODULE handle = LoadLibraryA(filename);
#else
    void *handle = dlopen(filename, RTLD_LAZY);
#endif
    JS_FreeCString(ctx, filename);
    if (!handle) return JS_NULL;
    return JS_NewInt64(ctx, (int64_t)(uintptr_t)handle);
}

static JSValue js_native_dlsym(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc < 2) return JS_ThrowTypeError(ctx, "Handle and symbol name required");
    int64_t handle_val;
    if (JS_ToInt64(ctx, &handle_val, argv[0]) < 0) return JS_EXCEPTION;
    const char *symname = JS_ToCString(ctx, argv[1]);
    if (!symname) return JS_EXCEPTION;
#ifdef _WIN32
    FARPROC sym = GetProcAddress((HMODULE)(uintptr_t)handle_val, symname);
#else
    void *sym = dlsym((void *)(uintptr_t)handle_val, symname);
#endif
    JS_FreeCString(ctx, symname);
    if (!sym) return JS_NULL;
    return JS_NewInt64(ctx, (int64_t)(uintptr_t)sym);
}

static JSValue js_native_dlclose(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc < 1) return JS_ThrowTypeError(ctx, "Handle required");
    int64_t handle_val;
    if (JS_ToInt64(ctx, &handle_val, argv[0]) < 0) return JS_EXCEPTION;
#ifdef _WIN32
    FreeLibrary((HMODULE)(uintptr_t)handle_val);
#else
    dlclose((void *)(uintptr_t)handle_val);
#endif
    return JS_UNDEFINED;
}

static JSValue js_native_invoke(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    if (argc < 2) return JS_ThrowTypeError(ctx, "Function address and arguments array required");

    int64_t addr_val;
    if (JS_ToInt64(ctx, &addr_val, argv[0]) < 0) return JS_EXCEPTION;
    void *fn = (void *)(uintptr_t)addr_val;

    if (!JS_IsArray(ctx, argv[1])) {
        return JS_ThrowTypeError(ctx, "Second argument must be an array of arguments");
    }

    JSValue len_val = JS_GetPropertyStr(ctx, argv[1], "length");
    int64_t len = 0;
    JS_ToInt64(ctx, &len, len_val);
    JS_FreeValue(ctx, len_val);

    if (len < 0 || len > 6) {
        return JS_ThrowTypeError(ctx, "Supported argument count: 0 to 6");
    }

    uint64_t args[6] = {0};
    const char *cstr_storage[6] = {0};
    int cstr_count = 0;

    for (int i = 0; i < len; i++) {
        JSValue item = JS_GetPropertyUint32(ctx, argv[1], i);
        if (JS_IsString(item)) {
            const char *cstr = JS_ToCString(ctx, item);
            cstr_storage[cstr_count++] = cstr;
            args[i] = (uint64_t)(uintptr_t)cstr;
        } else if (JS_IsBool(item)) {
            args[i] = (uint64_t)JS_ToBool(ctx, item);
        } else {
            size_t psize = 0;
            uint8_t *buf_ptr = JS_GetArrayBuffer(ctx, &psize, item);
            if (buf_ptr != NULL) {
                args[i] = (uint64_t)(uintptr_t)buf_ptr;
            } else {
                int64_t val = 0;
                JS_ToInt64(ctx, &val, item);
                args[i] = (uint64_t)val;
            }
        }
        JS_FreeValue(ctx, item);
    }

    uint64_t ret = 0;
    switch (len) {
        case 0: ret = ((ffi_fn0)fn)(); break;
        case 1: ret = ((ffi_fn1)fn)(args[0]); break;
        case 2: ret = ((ffi_fn2)fn)(args[0], args[1]); break;
        case 3: ret = ((ffi_fn3)fn)(args[0], args[1], args[2]); break;
        case 4: ret = ((ffi_fn4)fn)(args[0], args[1], args[2], args[3]); break;
        case 5: ret = ((ffi_fn5)fn)(args[0], args[1], args[2], args[3], args[4]); break;
        case 6: ret = ((ffi_fn6)fn)(args[0], args[1], args[2], args[3], args[4], args[5]); break;
    }

    for (int i = 0; i < cstr_count; i++) {
        JS_FreeCString(ctx, cstr_storage[i]);
    }

    return JS_NewInt64(ctx, (int64_t)ret);
}

static const JSCFunctionListEntry native_funcs[] = {
    JS_CFUNC_DEF("dlopen", 1, js_native_dlopen),
    JS_CFUNC_DEF("dlsym", 2, js_native_dlsym),
    JS_CFUNC_DEF("dlclose", 1, js_native_dlclose),
    JS_CFUNC_DEF("invoke", 2, js_native_invoke), // <-- Enregistrement de invoke
};

void js_init_native_ffi(JSContext *ctx) {
    JSValue global_obj = JS_GetGlobalObject(ctx);
    JSValue ffi_obj = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, ffi_obj, native_funcs, countof(native_funcs));
    JS_SetPropertyStr(ctx, global_obj, "native", ffi_obj);
    JS_FreeValue(ctx, global_obj);
}
