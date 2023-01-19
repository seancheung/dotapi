import type { TypeNode } from 'typescript';

export abstract class Extractor {
  /**
   * Extract all requests
   */
  protected abstract extractRequests(): Iterable<ExtractedRequest>;

  run() {
    for (const req of this.extractRequests()) {
      // TODO:
    }
  }
}

export interface ExtractedRequest
  extends ExtractedRequest.NameTrait,
    ExtractedRequest.CommentTrait {
  url: string;
  method: ExtractedRequest.HttpMethod;
  params?: ExtractedRequest.Param[];
  response?: TypeNode;
}
export namespace ExtractedRequest {
  export interface Param extends NameTrait, CommentTrait {
    kind: 'body' | 'url' | 'query';
    name: string;
    optional?: boolean;
    type: TypeNode;
  }
  export interface NameTrait {
    name: string;
  }
  export interface CommentTrait {
    commend?: string;
  }
  export type HttpMethod =
    | 'get'
    | 'delete'
    | 'head'
    | 'options'
    | 'post'
    | 'put'
    | 'patch'
    | 'purge'
    | 'link'
    | 'unlink';
}
