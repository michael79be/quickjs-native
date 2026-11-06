#include "quickjs.h"
#include "quickjs-libc.h"

extern const uint8_t qjsc_#name#[];
extern const uint32_t qjsc_#name#_size;

extern void js_init_native_ffi(JSContext *ctx);

int main(int argc, char **argv) {
    JSRuntime *rt = JS_NewRuntime();

    js_std_init_handlers(rt);

    JSContext *ctx = JS_NewContext(rt);

    js_std_add_helpers(ctx, argc, argv);

    js_init_module_os(ctx, "os");
    js_init_module_std(ctx, "std");

    js_init_native_ffi(ctx);

    js_std_eval_binary(ctx, qjsc_#name#, qjsc_#name#_size, 0);

    js_std_loop(ctx);

    js_std_free_handlers(rt);

    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);

    return 0;
}
