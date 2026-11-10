//! pcodec (pco "standalone" format, as numcodecs.pcodec writes it) decoder
//! for the browser. Plain C ABI, no bindings generator:
//!   alloc(n) -> ptr          space for the compressed bytes
//!   decode(ptr, n, dtype)    0 = ok; the result is then at out_ptr(), out_len() bytes
//!   free_in(ptr, n)
//! dtype: 1 i16, 2 i32, 3 i64, 4 u16, 5 u32, 6 u64, 7 f32, 8 f64, 9 f16
//! (pco's standalone format has no 8-bit types)
use pco::standalone::simple_decompress;

static mut OUT: Vec<u8> = Vec::new();

#[no_mangle]
pub extern "C" fn alloc(n: usize) -> *mut u8 {
    let mut v = Vec::<u8>::with_capacity(n);
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

#[no_mangle]
pub unsafe extern "C" fn free_in(p: *mut u8, n: usize) {
    drop(Vec::from_raw_parts(p, 0, n));
}

fn bytes<T: pco::data_types::Number>(src: &[u8]) -> Option<Vec<u8>> {
    let v = simple_decompress::<T>(src).ok()?;
    let n = v.len() * std::mem::size_of::<T>();
    let mut out = Vec::<u8>::with_capacity(n);
    unsafe {
        std::ptr::copy_nonoverlapping(v.as_ptr() as *const u8, out.as_mut_ptr(), n);
        out.set_len(n);
    }
    Some(out)
}

#[no_mangle]
pub unsafe extern "C" fn decode(p: *const u8, n: usize, dtype: u32) -> u32 {
    let src = std::slice::from_raw_parts(p, n);
    let r = match dtype {
        1 => bytes::<i16>(src),
        2 => bytes::<i32>(src),
        3 => bytes::<i64>(src),
        4 => bytes::<u16>(src),
        5 => bytes::<u32>(src),
        6 => bytes::<u64>(src),
        7 => bytes::<f32>(src),
        8 => bytes::<f64>(src),
        9 => bytes::<half::f16>(src),
        _ => None,
    };
    match r {
        Some(v) => { OUT = v; 0 }
        None => 1,
    }
}

#[no_mangle]
pub unsafe extern "C" fn out_ptr() -> *const u8 { (*std::ptr::addr_of!(OUT)).as_ptr() }

#[no_mangle]
pub unsafe extern "C" fn out_len() -> usize { (*std::ptr::addr_of!(OUT)).len() }
