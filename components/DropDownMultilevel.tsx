import { useState, useRef, useEffect } from "react";

type Option = {
  label: string;
  value: string;
  children?: Option[];
};

type Props = {
  options: Option[];
  selected?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
};

const DropDownMultiLevel = ({
  options,
  selected,
  onSelect,
  placeholder = "Select",
}: Props) => {
  const [openMain, setOpenMain] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutside(e: PointerEvent) {
      if (!rootRef.current) return;
      const target = e.target as Node | null;
      if (target && !rootRef.current.contains(target)) {
        setOpenMain(false);
        setOpenIndex(null);
      }
    }

    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, []);

  const findLabel = (val?: string) => {
    if (!val) return placeholder;
    const search = (opts: Option[]): string | null => {
      for (const o of opts) {
        if (o.value === val) return o.label;
        if (o.children) {
          const r = search(o.children);
          if (r) return r;
        }
      }
      return null;
    };

    return search(options) ?? placeholder;
  };

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        onClick={() => setOpenMain((s) => !s)}
        className="inline-flex items-center justify-center text-white bg-slate-800 hover:bg-slate-700 focus:ring-2 focus:ring-slate-600 font-medium rounded-md text-sm px-3 py-2"
        aria-haspopup="menu"
      >
        {findLabel(selected)}
        <svg
          className="w-4 h-4 ms-1.5 ml-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19 9-7 7-7-7"
          />
        </svg>
      </button>

      {openMain && (
        <div className="absolute mt-2 z-10 bg-slate-900 border border-slate-700 rounded-md shadow-lg w-44 max-h-60 overflow-auto">
          <ul className="p-1 text-sm text-gray-200">
            {options.map((opt, i) => (
              <li key={opt.value} className="relative">
                <button
                  onClick={() => {
                    if (opt.children && opt.children.length) {
                      setOpenIndex(openIndex === i ? null : i);
                    } else {
                      onSelect(opt.value);
                      setOpenMain(false);
                      setOpenIndex(null);
                    }
                  }}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-slate-800 rounded"
                >
                  {opt.label}
                  {opt.children && opt.children.length ? (
                    <svg
                      className="h-4 w-4 ms-auto ml-auto"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m9 5 7 7-7 7"
                      />
                    </svg>
                  ) : null}
                </button>

                {opt.children && openIndex === i && (
                  <div className="absolute left-full top-0 ml-1 bg-slate-900 border border-slate-700 rounded-md shadow-lg w-44 max-h-60 overflow-auto">
                    <ul className="p-1 text-sm text-gray-200">
                      {opt.children.map((c) => (
                        <li key={c.value}>
                          <button
                            onClick={() => {
                              onSelect(c.value);
                              setOpenMain(false);
                              setOpenIndex(null);
                            }}
                            className="block w-full text-left px-3 py-2 hover:bg-slate-800 rounded"
                          >
                            {c.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DropDownMultiLevel;