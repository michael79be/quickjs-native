#include "quickjs.h"
#include "quickjs-libc.h"
#include "stdint.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#include <windows.h>
#else
#include <dlfcn.h>
#include <sys/stat.h>
#include <unistd.h>
#ifdef __APPLE__
#include <mach-o/dyld.h>
#else
#include <limits.h>
#endif
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

    if (argc >= 3 && JS_IsString(argv[2])) {
        const char *type_hint = JS_ToCString(ctx, argv[2]);
        JSValue js_ret;
        if (strcmp(type_hint, "string") == 0) {
            if (ret == 0) {
                js_ret = JS_NULL;
            } else {
                js_ret = JS_NewString(ctx, (const char *)(uintptr_t)ret);
            }
        } else if (strcmp(type_hint, "bool") == 0) {
            js_ret = JS_NewBool(ctx, (int)ret);
        } else {
            js_ret = JS_NewInt64(ctx, (int64_t)ret);
        }
        JS_FreeCString(ctx, type_hint);

        return js_ret;
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

static const uint8_t bundle_begin[] = "QJS_BEGIN";
static const uint8_t bundle_end[] = "QJS_END";

static char *duplicate_string(const char *str) {
    size_t len = strlen(str) + 1;
    char *copy = malloc(len);
    if (copy)
        memcpy(copy, str, len);
    return copy;
}

static char *get_executable_path(const char *argv0) {
#ifdef _WIN32
    char path[32768];
    DWORD len = GetModuleFileNameA(NULL, path, (DWORD)sizeof(path));
    if (len > 0 && len < sizeof(path)) {
        path[len] = '\0';
        return duplicate_string(path);
    }
#elif defined(__APPLE__)
    uint32_t len = 0;
    _NSGetExecutablePath(NULL, &len);
    if (len > 0) {
        char *path = malloc(len);
        if (path && _NSGetExecutablePath(path, &len) == 0)
            return path;
        free(path);
    }
#else
    char path[PATH_MAX + 1];
    ssize_t len = readlink("/proc/self/exe", path, PATH_MAX);
    if (len > 0) {
        path[len] = '\0';
        return duplicate_string(path);
    }
#endif
    return duplicate_string(argv0);
}

static uint8_t *read_file(const char *path, size_t *size) {
    FILE *file = fopen(path, "rb");
    uint8_t *data;
    long file_size;

    if (!file) {
        perror(path);
        return NULL;
    }
    if (fseek(file, 0, SEEK_END) != 0 || (file_size = ftell(file)) < 0 ||
        fseek(file, 0, SEEK_SET) != 0) {
        fprintf(stderr, "Cannot determine file size: %s\n", path);
        fclose(file);
        return NULL;
    }
    data = malloc(file_size ? (size_t)file_size : 1);
    if (!data) {
        fprintf(stderr, "Out of memory reading: %s\n", path);
        fclose(file);
        return NULL;
    }
    if (fread(data, 1, (size_t)file_size, file) != (size_t)file_size) {
        fprintf(stderr, "Cannot read file: %s\n", path);
        free(data);
        fclose(file);
        return NULL;
    }
    if (fclose(file) != 0) {
        perror(path);
        free(data);
        return NULL;
    }
    *size = (size_t)file_size;
    return data;
}

static uint32_t crc32(const uint8_t *data, size_t size) {
    uint32_t crc = UINT32_MAX;
    size_t i;
    int bit;

    for (i = 0; i < size; i++) {
        crc ^= data[i];
        for (bit = 0; bit < 8; bit++)
            crc = (crc >> 1) ^ (0xedb88320U & (uint32_t)-(int32_t)(crc & 1));
    }
    return crc ^ UINT32_MAX;
}

static void write_u32le(uint8_t *dst, uint32_t value) {
    dst[0] = (uint8_t)value;
    dst[1] = (uint8_t)(value >> 8);
    dst[2] = (uint8_t)(value >> 16);
    dst[3] = (uint8_t)(value >> 24);
}

static uint32_t read_u32le(const uint8_t *src) {
    return (uint32_t)src[0] |
           (uint32_t)src[1] << 8 |
           (uint32_t)src[2] << 16 |
           (uint32_t)src[3] << 24;
}

static void write_u64le(uint8_t *dst, uint64_t value) {
    int i;
    for (i = 0; i < 8; i++)
        dst[i] = (uint8_t)(value >> (i * 8));
}

static uint64_t read_u64le(const uint8_t *src) {
    uint64_t value = 0;
    int i;
    for (i = 0; i < 8; i++)
        value |= (uint64_t)src[i] << (i * 8);
    return value;
}

static int make_bundle(const char *source_path, const char *output_path,
                       const char *argv0, JSContext *ctx) {
    size_t source_size, bytecode_size, executable_size;
    uint8_t *source = NULL, *bytecode = NULL, *executable = NULL;
    uint8_t crc_buf[4], size_buf[8], code_flag = 1;
    JSValue compiled = JS_UNDEFINED;
    FILE *output = NULL;
    char *executable_path = NULL;
    int eval_flags, ret = -1;
#ifndef _WIN32
    struct stat executable_stat;
#endif

    source = js_load_file(ctx, &source_size, source_path);
    if (!source) {
        perror(source_path);
        goto done;
    }
    compiled = JS_ReadObject(ctx, source, source_size, JS_READ_OBJ_BYTECODE);
    if (JS_IsException(compiled)) {
        JSValue exception = JS_GetException(ctx);
        JS_FreeValue(ctx, exception);
        eval_flags = (JS_DetectModule((const char *)source, source_size) ||
                      (strlen(source_path) >= 4 &&
                       strcmp(source_path + strlen(source_path) - 4, ".mjs") == 0))
                         ? JS_EVAL_TYPE_MODULE
                         : JS_EVAL_TYPE_GLOBAL;
        compiled = JS_Eval(ctx, (const char *)source, source_size, source_path,
                           eval_flags | JS_EVAL_FLAG_COMPILE_ONLY);
    }
    if (JS_IsException(compiled)) {
        js_std_dump_error(ctx);
        goto done;
    }
    bytecode = JS_WriteObject(ctx, &bytecode_size, compiled, JS_WRITE_OBJ_BYTECODE);
    if (!bytecode) {
        js_std_dump_error(ctx);
        goto done;
    }

    executable_path = get_executable_path(argv0);
    if (!executable_path) {
        fprintf(stderr, "Cannot determine executable path\n");
        goto done;
    }
#ifndef _WIN32
    if (stat(executable_path, &executable_stat) != 0) {
        perror(executable_path);
        goto done;
    }
#endif
    executable = read_file(executable_path, &executable_size);
    if (!executable)
        goto done;

    output = fopen(output_path, "wb");
    if (!output) {
        perror(output_path);
        goto done;
    }
    write_u32le(crc_buf, crc32(bytecode, bytecode_size));
    write_u64le(size_buf, (uint64_t)bytecode_size);
    if (fwrite(executable, 1, executable_size, output) != executable_size ||
        fwrite(bundle_begin, 1, sizeof(bundle_begin) - 1, output) != sizeof(bundle_begin) - 1 ||
        fwrite(&code_flag, 1, sizeof(code_flag), output) != sizeof(code_flag) ||
        fwrite(bytecode, 1, bytecode_size, output) != bytecode_size ||
        fwrite(crc_buf, 1, sizeof(crc_buf), output) != sizeof(crc_buf) ||
        fwrite(size_buf, 1, sizeof(size_buf), output) != sizeof(size_buf) ||
        fwrite(bundle_end, 1, sizeof(bundle_end) - 1, output) != sizeof(bundle_end) - 1) {
        fprintf(stderr, "Cannot write bundle: %s\n", output_path);
        goto done;
    }
    if (fclose(output) != 0) {
        output = NULL;
        perror(output_path);
        goto done;
    }
    output = NULL;
#ifndef _WIN32
    if (chmod(output_path, executable_stat.st_mode & 0777) != 0) {
        perror(output_path);
        goto done;
    }
#endif
    ret = 0;

done:
    if (output)
        fclose(output);
    if (compiled != JS_UNDEFINED)
        JS_FreeValue(ctx, compiled);
    js_free(ctx, bytecode);
    js_free(ctx, source);
    free(executable);
    free(executable_path);
    return ret;
}

/* Returns 1 for a valid bundle, 0 if no end marker is present, and -1 if invalid. */
static int find_bundle(const uint8_t *file, size_t file_size,
                       const uint8_t **code, size_t *code_size,
                       uint8_t *code_flag) {
    const size_t begin_size = sizeof(bundle_begin) - 1;
    const size_t end_size = sizeof(bundle_end) - 1;
    const size_t trailer_size = end_size + 8 + 4;
    uint64_t stored_size;
    size_t payload_offset, crc_offset;

    if (file_size < end_size ||
        memcmp(file + file_size - end_size, bundle_end, end_size) != 0)
        return 0;
    if (file_size < trailer_size + begin_size + 1) {
        fprintf(stderr, "Invalid bundle: truncated trailer\n");
        return -1;
    }
    stored_size = read_u64le(file + file_size - end_size - 8);
    if (stored_size > SIZE_MAX) {
        fprintf(stderr, "Invalid bundle: code is too large\n");
        return -1;
    }
    *code_size = (size_t)stored_size;
    if (*code_size > file_size - trailer_size - begin_size - 1) {
        fprintf(stderr, "Invalid bundle: invalid code size\n");
        return -1;
    }
    payload_offset = file_size - trailer_size - *code_size;
    if (payload_offset < begin_size + 1 ||
        memcmp(file + payload_offset - begin_size - 1, bundle_begin, begin_size) != 0) {
        fprintf(stderr, "Invalid bundle: start marker not found\n");
        return -1;
    }
    *code_flag = file[payload_offset - 1];
    if (*code_flag > 1) {
        fprintf(stderr, "Invalid bundle: unknown code format\n");
        return -1;
    }
    *code = file + payload_offset;
    crc_offset = payload_offset + *code_size;
    if (read_u32le(file + crc_offset) != crc32(*code, *code_size)) {
        fprintf(stderr, "Invalid bundle: CRC32 mismatch\n");
        return -1;
    }
    return 1;
}

static int evaluate_compiled(JSContext *ctx, JSValue compiled, int use_realpath) {
    JSValue result;
    int ret = 0;

    if (JS_IsException(compiled)) {
        js_std_dump_error(ctx);
        JS_FreeValue(ctx, compiled);
        return -1;
    }
    if (JS_VALUE_GET_TAG(compiled) == JS_TAG_MODULE) {
        if (js_module_set_import_meta(ctx, compiled, use_realpath, 1) < 0) {
            JS_FreeValue(ctx, compiled);
            js_std_dump_error(ctx);
            return -1;
        }
    }
    result = JS_EvalFunction(ctx, compiled);
    result = js_std_await(ctx, result);
    if (JS_IsException(result)) {
        js_std_dump_error(ctx);
        ret = -1;
    }
    JS_FreeValue(ctx, result);
    return ret;
}

static int evaluate_bytecode(JSContext *ctx, const uint8_t *bytecode,
                             size_t bytecode_size) {
    JSValue compiled = JS_ReadObject(ctx, bytecode, bytecode_size,
                                     JS_READ_OBJ_BYTECODE);
    if (!JS_IsException(compiled) &&
        JS_VALUE_GET_TAG(compiled) == JS_TAG_MODULE &&
        JS_ResolveModule(ctx, compiled) < 0) {
        JS_FreeValue(ctx, compiled);
        js_std_dump_error(ctx);
        return -1;
    }
    return evaluate_compiled(ctx, compiled, 0);
}

static int evaluate_source(JSContext *ctx, const uint8_t *source,
                           size_t source_size, const char *filename,
                           int use_realpath) {
    char *source_copy;
    size_t filename_size = strlen(filename);
    int eval_flags;
    JSValue compiled;

    if (source_size == SIZE_MAX) {
        fprintf(stderr, "JavaScript source is too large\n");
        return -1;
    }
    source_copy = js_malloc(ctx, source_size + 1);
    if (!source_copy) {
        js_std_dump_error(ctx);
        return -1;
    }
    memcpy(source_copy, source, source_size);
    source_copy[source_size] = '\0';

    eval_flags = (JS_DetectModule(source_copy, source_size) ||
                      (filename_size >= 4 &&
                       strcmp(filename + filename_size - 4, ".mjs") == 0))
                         ? JS_EVAL_TYPE_MODULE
                         : JS_EVAL_TYPE_GLOBAL;
    compiled = JS_Eval(ctx, source_copy, source_size, filename,
                       eval_flags | JS_EVAL_FLAG_COMPILE_ONLY);
    js_free(ctx, source_copy);
    return evaluate_compiled(ctx, compiled, use_realpath);
}

static int evaluate_input(JSContext *ctx, const uint8_t *data, size_t data_size,
                          const char *filename) {
    JSValue compiled = JS_ReadObject(ctx, data, data_size, JS_READ_OBJ_BYTECODE);

    if (!JS_IsException(compiled))
        return evaluate_compiled(ctx, compiled, 0);
    {
        JSValue exception = JS_GetException(ctx);
        JS_FreeValue(ctx, exception);
    }
    return evaluate_source(ctx, data, data_size, filename, 1);
}

int main(int argc, char **argv) {
    JSRuntime *rt;
    JSContext *ctx;
    uint8_t *self = NULL, *source = NULL;
    const uint8_t *code = NULL;
    size_t self_size = 0, source_size = 0, code_size = 0;
    char *executable_path = NULL;
    uint8_t code_flag = 0;
    int bundle_status, ret = 1;
    int pass_args = argc > 1 && strcmp(argv[1], "--args") == 0;

    if (argc > 1 && strcmp(argv[1], "--bundle") == 0) {
        fprintf(stderr, "Usage: %s <script.js> [--bundle <output>] | --args [arguments...]\n",
                argv[0]);
        return 2;
    }
    if (!pass_args && argc >= 3 && strcmp(argv[2], "--bundle") == 0 && argc != 4) {
        fprintf(stderr, "Usage: %s <script.js> --bundle <output>\n", argv[0]);
        return 2;
    }

    if (argc == 1 || pass_args) {
        executable_path = get_executable_path(argv[0]);
        if (!executable_path)
            return 1;
        self = read_file(executable_path, &self_size);
        free(executable_path);
        if (!self)
            return 1;
        bundle_status = find_bundle(self, self_size, &code, &code_size, &code_flag);
        if (bundle_status == 0) {
            fprintf(stderr, "Usage: %s <script.js> [--bundle <output>] | --args [arguments...]\n",
                    argv[0]);
            free(self);
            return 2;
        }
        if (bundle_status < 0) {
            free(self);
            return 1;
        }
    }

    rt = JS_NewRuntime();
    if (!rt) {
        fprintf(stderr, "Cannot allocate JS runtime\n");
        free(self);
        return 1;
    }
    js_std_init_handlers(rt);
    ctx = JS_NewContext(rt);
    if (!ctx) {
        fprintf(stderr, "Cannot allocate JS context\n");
        js_std_free_handlers(rt);
        JS_FreeRuntime(rt);
        free(self);
        return 1;
    }
    JS_SetModuleLoaderFunc2(rt, NULL, js_module_loader,
                            js_module_check_attributes, NULL);
    js_init_module_std(ctx, "std");
    js_init_module_os(ctx, "os");
    js_init_native_ffi(ctx);
    if (pass_args)
        js_std_add_helpers(ctx, argc - 2, argv + 2);
    else
        js_std_add_helpers(ctx, argc - 1, argv + 1);

    if (argc == 1 || pass_args) {
        ret = (code_flag == 1
            ? evaluate_bytecode(ctx, code, code_size)
            : evaluate_source(ctx, code, code_size, "<bundle>", 0)) == 0 ? 0 : 1;
    } else if (argc == 4 && strcmp(argv[2], "--bundle") == 0) {
        ret = make_bundle(argv[1], argv[3], argv[0], ctx) == 0 ? 0 : 1;
    } else {
        source = js_load_file(ctx, &source_size, argv[1]);
        if (!source) {
            perror(argv[1]);
            goto done;
        }
        if (evaluate_input(ctx, source, source_size, argv[1]) < 0)
            goto done;
        ret = 0;
    }
    if (ret == 0)
        js_std_loop(ctx);

done:
    js_free(ctx, source);
    free(self);
    js_std_free_handlers(rt);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    return ret;
}
