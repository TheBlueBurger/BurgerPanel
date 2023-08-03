export interface ModrinthPluginResult { // thanks https://app.quicktype.io/
    project_id:         string;
    project_type:       string;
    slug:               string;
    author:             string;
    title:              string;
    description:        string;
    categories:         string[];
    display_categories: string[];
    versions:           string[];
    downloads:          number;
    follows:            number;
    icon_url:           string;
    date_created:       string;
    date_modified:      string;
    latest_version:     string;
    license:            string;
    client_side:        string;
    server_side:        string;
    gallery:            string[];
    featured_gallery:   null;
    color:              number;
}

export interface Plugin {
    id:                    string;
    slug:                  string;
    project_type:          string;
    team:                  string;
    title:                 string;
    description:           string;
    body:                  string;
    body_url:              null;
    published:             Date;
    updated:               Date;
    approved:              null;
    queued:                null;
    status:                string;
    requested_status:      null;
    moderator_message:     null;
    license:               License;
    client_side:           string;
    server_side:           string;
    downloads:             number;
    followers:             number;
    categories:            string[];
    additional_categories: string[];
    game_versions:         string[];
    loaders:               string[];
    versions:              string[];
    icon_url:              string;
    issues_url:            string;
    source_url:            string;
    wiki_url:              string;
    discord_url:           string;
    donation_urls:         DonationURL[];
    gallery:               Gallery[];
    flame_anvil_project:   null;
    flame_anvil_user:      null;
    color:                 number;
}

export interface DonationURL {
    id:       string;
    platform: string;
    url:      string;
}

export interface Gallery {
    url:         string;
    featured:    boolean;
    title:       string;
    description: string;
    created:     Date;
    ordering:    number;
}

export interface License {
    id:   string;
    name: string;
    url:  null;
}

export interface Version {
    name:             string;
    version_number:   string;
    changelog:        string;
    dependencies:     Dependency[];
    game_versions:    string[];
    version_type:     string;
    loaders:          string[];
    featured:         boolean;
    status:           string;
    requested_status: string;
    id:               string;
    project_id:       string;
    author_id:        string;
    date_published:   string;
    downloads:        number;
    changelog_url:    null;
    files:            File[];
}

export interface Dependency {
    version_id:      string;
    project_id:      string;
    file_name:       string;
    dependency_type: string;
}

export interface File {
    hashes:    Hashes;
    url:       string;
    filename:  string;
    primary:   boolean;
    size:      number;
    file_type: string;
}

export interface Hashes {
    sha512: string;
    sha1:   string;
}
