import { afterEach, describe, expect, it, vi } from "vitest";

const manipulador = vi.hoisted(() => ({
  manipulate: vi.fn(),
  saveAsync: vi.fn(),
}));

vi.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: manipulador.manipulate },
  SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" },
}));

import { ajustarFotoBaucher } from "@/utils/baucherFoto";
import { BAUCHER_FOTO_MAX_CHARS } from "@lasmunecasderamon/validations";

/** Contexto encadenable del manipulador: `resize()` devuelve siempre el mismo. */
function contextoEncadenable() {
  const contexto = {
    resize: vi.fn(() => contexto),
    renderAsync: vi.fn(async () => ({ saveAsync: manipulador.saveAsync })),
  };
  return contexto;
}

const gigante = `data:image/jpeg;base64,${"A".repeat(BAUCHER_FOTO_MAX_CHARS + 1)}`;
const URI = "file:///tmp/baucher.jpg";

afterEach(() => {
  vi.clearAllMocks();
});

describe("ajustarFotoBaucher", () => {
  it("devuelve tal cual una foto que ya cabe, sin tocar el manipulador", async () => {
    const dataUrl = `data:image/jpeg;base64,${"B".repeat(500)}`;

    const resultado = await ajustarFotoBaucher(dataUrl, URI);

    expect(resultado).toEqual({ ok: true, dataUrl });
    expect(manipulador.manipulate).not.toHaveBeenCalled();
  });

  it("reduce la foto gigante a 1600 px y devuelve el data URL que sí entra", async () => {
    const contexto = contextoEncadenable();
    manipulador.manipulate.mockReturnValue(contexto);
    manipulador.saveAsync.mockResolvedValue({ base64: "REDUCIDA" });

    const resultado = await ajustarFotoBaucher(gigante, URI);

    expect(manipulador.manipulate).toHaveBeenCalledWith(URI);
    expect(contexto.resize).toHaveBeenCalledWith({ width: 1600 });
    expect(manipulador.saveAsync).toHaveBeenCalledWith({
      compress: 0.6,
      base64: true,
      format: "jpeg",
    });
    expect(resultado).toEqual({ ok: true, dataUrl: "data:image/jpeg;base64,REDUCIDA" });
  });

  it("manipula desde el data URL cuando el picker no dejó archivo temporal", async () => {
    const contexto = contextoEncadenable();
    manipulador.manipulate.mockReturnValue(contexto);
    manipulador.saveAsync.mockResolvedValue({ base64: "REDUCIDA" });

    const resultado = await ajustarFotoBaucher(gigante);

    expect(manipulador.manipulate).toHaveBeenCalledWith(gigante);
    expect(resultado.ok).toBe(true);
  });

  it("baja la calidad sucesivamente hasta que la foto entre en el límite", async () => {
    const contexto = contextoEncadenable();
    const enorme = `${"C".repeat(BAUCHER_FOTO_MAX_CHARS + 1)}`;
    manipulador.manipulate.mockReturnValue(contexto);
    // Primera y segunda pasada siguen pasando el tope; la tercera ya no.
    manipulador.saveAsync
      .mockResolvedValueOnce({ base64: enorme })
      .mockResolvedValueOnce({ base64: enorme })
      .mockResolvedValueOnce({ base64: "EN-LIMITE" });

    const resultado = await ajustarFotoBaucher(gigante, URI);

    expect(resultado).toEqual({ ok: true, dataUrl: "data:image/jpeg;base64,EN-LIMITE" });
    expect(manipulador.saveAsync).toHaveBeenCalledTimes(3);
    expect(manipulador.saveAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ compress: 0.25 }),
    );
  });

  it("informa no-cabe cuando ninguna calidad baja del tope", async () => {
    const contexto = contextoEncadenable();
    const enorme = `${"D".repeat(BAUCHER_FOTO_MAX_CHARS + 1)}`;
    manipulador.manipulate.mockReturnValue(contexto);
    manipulador.saveAsync.mockResolvedValue({ base64: enorme });

    const resultado = await ajustarFotoBaucher(gigante, URI);

    expect(resultado).toEqual({ ok: false, motivo: "no-cabe" });
    expect(manipulador.saveAsync).toHaveBeenCalledTimes(3);
  });

  it("informa no-se-pudo cuando el manipulador falla, sin lanzar", async () => {
    manipulador.manipulate.mockImplementation(() => {
      throw new Error("nativo no disponible");
    });

    const resultado = await ajustarFotoBaucher(gigante, URI);

    expect(resultado).toEqual({ ok: false, motivo: "no-se-pudo" });
  });
});
