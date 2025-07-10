interface IUser {
    id :string;
    name : string;
    email :string;
    full_name : string;
    password : string;
    created_at : Date;
    updated_at : Date;
}

interface ITeam {
    id :number;
    name: string ;
    owner_id: string;
    description: string;
    created_at: Date;
    updated_at: Date;
}

interface INote {
    id : number;
    content : string;
    attachment :string;
    visibility : string;
    user_id : string; 
    post_id : number;
    parent_id : number | null;
    created_at : Date;
    updated_at : Date;
}

interface IPost {
    id : number;
    title : string ;
    content : string 
    attachment : string;
    visibility : string;
    slug: string;
    user_id : number;
    team_id : number;
    created_at : Date;
    updated_at : Date;
}

interface INotification {
    id : number;
    user_id : number;
    type : string;
    payload : string;
    read : boolean;
    created_at : Date;
}


interface IMember_Team{
    id : number;
    user_id : number;
    team_id : number;
    role_id : number;
    created_at: Date;
}

interface IRole {
    id:number;
    name:string;
}

interface IMessage {
    id : number;
    from_id: string;  
    to_id: string;
    content : string;
    attachment : string;
    created_at: Date;
}

interface ITeam_Message {
    id: number;
    team_id: number;
    from_id: number;
    content: string;
    attachment: string;
    created_at: Date;
}

interface IProfile {
    id: string;
    name: string;
    avatar_url: string;
    created_at: Date;
    updated_at: Date;
}

export type {
    IUser,
    ITeam,
    INote,
    IPost,
    INotification,
    IMember_Team,
    IRole,
    IMessage,
    ITeam_Message
};

