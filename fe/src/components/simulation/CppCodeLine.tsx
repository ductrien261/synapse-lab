import { tokenizeCpp, type CppTokenKind } from './cpp-syntax';

const TOKEN_COLORS: Record<CppTokenKind, string> = {
  plain: 'text-[#CDD6F4]', keyword: 'text-[#CBA6F7]', type: 'text-[#89B4FA]',
  function: 'text-[#F9E2AF]', number: 'text-[#A6E3A1]', string: 'text-[#FAB387]',
  comment: 'text-[#9399B2] italic', operator: 'text-[#89DCEB]',
};
export function CppCodeLine({ code }: { code: string }) {
  return <>{tokenizeCpp(code).map((token, index) => <span key={index} className={TOKEN_COLORS[token.kind]}>{token.text}</span>)}</>;
}
