declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

declare module 'https://esm.sh/tweetnacl@1.0.3' {
  const nacl: {
    sign: {
      detached: {
        verify: (
          message: Uint8Array,
          signature: Uint8Array,
          publicKey: Uint8Array,
        ) => boolean;
      };
    };
  };
  export default nacl;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.49.1' {
  export * from '@supabase/supabase-js';
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
