export default new class TitleManager {
    private titlePrefix: string = "";
    private titleSuffix: string = " - BurgerPanel";
    private defaultTitle: string = "BurgerPanel";
    constructor() {
        this._setTitle(this.defaultTitle);
    }
    setTitle(title: string) {
        this._setTitle(this.titlePrefix + title + this.titleSuffix);
    }
    private _setTitle(title: string) {
        if(document.title == title) return;
        if(import.meta.env.DEV) console.log("Setting title to", title)
        document.title = title;
    }
    resetTitle() {
        this._setTitle(this.defaultTitle);
    }
}