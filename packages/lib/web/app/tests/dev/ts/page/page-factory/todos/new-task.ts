import { type TemplateResult, html } from '@cdp/template';

export const NewTask = (
    inputText: string,
    onInput: (value: string) => void,
    onKeyPress: (e: KeyboardEvent) => void
): TemplateResult => html`
    <div class=align-center>
        <input
            type="text"
            .value=${inputText}
            @input=${(e: InputEvent) => onInput((e.currentTarget as HTMLInputElement).value)}
            @keypress=${onKeyPress}
            placeholder="what we have to do?"
        />
    </div>
`;
