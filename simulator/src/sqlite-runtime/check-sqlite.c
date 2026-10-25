/* Ordinary public APIs plus exact upstream sessionC-9.0 corruption regression. */
#include <sqlite3.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define REQUIRE(x) do { if(!(x)){fprintf(stderr,"SQLite check failed at line %d: %s\n",__LINE__,#x);exit(1);} }while(0)
static void sql(sqlite3 *db,const char *s){REQUIRE(sqlite3_exec(db,s,0,0,0)==SQLITE_OK);}
static int conflict(void *p,int type,sqlite3_changeset_iter *it){(void)p;(void)type;(void)it;return SQLITE_CHANGESET_ABORT;}
static int omit_conflict(void *p,int type,sqlite3_changeset_iter *it){(void)p;(void)type;(void)it;return SQLITE_CHANGESET_OMIT;}
int main(int argc,char **argv){
 sqlite3 *a=0,*b=0;sqlite3_session *session=0;sqlite3_stmt *stmt=0;void *changes=0,*combined=0;int n=0,ncombined=0,i;
 REQUIRE(strcmp(sqlite3_libversion(),"3.53.4")==0);
 if(argc==2 && strcmp(argv[1],"--options")==0){for(i=0;sqlite3_compileoption_get(i);i++)puts(sqlite3_compileoption_get(i));return 0;}
 if(argc==3 && strcmp(argv[1],"--exports")==0){char name[512];void *handle=dlopen("libsqlite3.so.0",RTLD_NOW);FILE *file=fopen(argv[2],"r");REQUIRE(handle && file);while(fscanf(file,"%511s",name)==1)REQUIRE(dlsym(handle,name)!=0);fclose(file);dlclose(handle);return 0;}
 REQUIRE(sqlite3_compileoption_used("ENABLE_SESSION"));REQUIRE(sqlite3_compileoption_used("ENABLE_PREUPDATE_HOOK"));
 REQUIRE(sqlite3_open(":memory:",&a)==SQLITE_OK);REQUIRE(sqlite3_open(":memory:",&b)==SQLITE_OK);
 sql(a,"CREATE TABLE t(id INTEGER PRIMARY KEY, value TEXT); CREATE VIRTUAL TABLE f USING fts5(value); INSERT INTO f VALUES('working search');");
 sql(b,"CREATE TABLE t(id INTEGER PRIMARY KEY, value TEXT)");
 REQUIRE(sqlite3session_create(a,"main",&session)==SQLITE_OK);REQUIRE(sqlite3session_attach(session,"t")==SQLITE_OK);
 sql(a,"BEGIN; INSERT INTO t VALUES(1,'roundtrip'); INSERT INTO t VALUES(2,'second'); COMMIT;");
 REQUIRE(sqlite3session_changeset(session,&n,&changes)==SQLITE_OK && n>0);
 REQUIRE(sqlite3changeset_apply(b,n,changes,0,conflict,0)==SQLITE_OK);
 REQUIRE(sqlite3_prepare_v2(b,"SELECT value FROM t WHERE id=1",-1,&stmt,0)==SQLITE_OK);
 REQUIRE(sqlite3_step(stmt)==SQLITE_ROW && strcmp((const char*)sqlite3_column_text(stmt,0),"roundtrip")==0);sqlite3_finalize(stmt);
 REQUIRE(sqlite3_prepare_v2(a,"PRAGMA integrity_check",-1,&stmt,0)==SQLITE_OK);REQUIRE(sqlite3_step(stmt)==SQLITE_ROW && strcmp((const char*)sqlite3_column_text(stmt,0),"ok")==0);sqlite3_finalize(stmt);
 /* Exact byte sequence from upstream c597ed79 sessionC-9.0. */
 {const unsigned char corrupt[]={0x54,0x01,0x01,0x74,0x00,0x17,0x00,0x00,0x03,0xff,0xff,0xff,0xff};
 REQUIRE(sqlite3changeset_concat(sizeof(corrupt),(void*)corrupt,sizeof(corrupt),(void*)corrupt,&ncombined,&combined)==SQLITE_CORRUPT);sqlite3_free(combined);}
 /* Exact upstream session9-7.1 apply_v2 regression and its ordinary setup. */
 sql(a,"  PRAGMA trusted_schema=OFF;\n  PRAGMA foreign_keys=ON;\n  CREATE TABLE t1(a INTEGER PRIMARY KEY, b, c, d);\n  CREATE TABLE t2(e TEXT PRIMARY KEY NOT NULL, f, g);\n  CREATE TABLE t3(w REAL PRIMARY KEY NOT NULL, x, y);\n  CREATE TABLE t4(z PRIMARY KEY) WITHOUT ROWID;\n  CREATE TABLE tc(a INTEGER, b INTEGER, c BLOB, d TEXT, PRIMARY KEY(a,b));\n  CREATE TABLE wr(a TEXT, b INT, c, PRIMARY KEY(a,b)) WITHOUT ROWID;\n  CREATE TABLE child(x INTEGER PRIMARY KEY, y INTEGER REFERENCES t1(a) ON DELETE CASCADE, z TEXT);\n  INSERT INTO t1 VALUES(1,2,3,4),(2,3.5,'four',x'556677'),(3,NULL,'xyz',15),(4,'bubba',2147483648,0.0);\n  INSERT INTO t1 SELECT a+4,c,d,b FROM t1;\n  INSERT INTO t2 VALUES('x1y',2,3),('x2y','four',x'556677'),('x3y',NULL,'xyz');\n  INSERT INTO t3 VALUES(1.1,'a','b'),(2.2,x'00ff','c');\n  INSERT INTO t4 VALUES('alpha'),('beta'),('gamma');\n  INSERT INTO tc VALUES(1,1,x'0102','one'),(1,2,x'0304','two'),(2,1,x'0506','three');\n  INSERT INTO wr VALUES('a',1,'wa'),('b',2,'wb');\n  INSERT INTO child VALUES(1,1,'c1'),(2,2,'c2');");
 {unsigned char corrupt[]={0x54,0x04,0x01,0x02,0x00,0x00,0x74,0x63,0x00,0x17,0x00,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x01,0x00,0x00,0x00,0x00,0x00,0x69,0x00,0x01,0x04,0x02,0x01,0x02,0x03,0x03,0x6f,0x6e,0x65,0x00,0x00,0x04,0x20,0x08,0x40,0xa1,0x4c,0x0b,0x0d,0x3f,0x37,0x30,0x5d,0x92,0x3f,0x18,0xf2,0xc9,0x66,0xa6,0x42,0x20,0xa8,0x73,0x04,0xcc,0x52,0x81,0xce,0x5c,0xd9,0xd4,0xdc,0x8b,0x70,0x03,0x05,0x6f,0x6e,0x65,0x2d,0x75,0x17,0x00,0x01,0x00,0x00,0x02,0x50,0x04,0x01,0x00,0x00,0x00,0x6d,0x69,0x78,0x00,0x17,0x00,0x03,0x02,0x6b,0x31,0x04,0x09,0x11,0x00};
 REQUIRE(sqlite3changeset_apply_v2(a,sizeof(corrupt),corrupt,0,omit_conflict,0,0,0,0)==SQLITE_CORRUPT);}
 sqlite3_free(changes);sqlite3session_delete(session);REQUIRE(sqlite3_close(a)==SQLITE_OK);REQUIRE(sqlite3_close(b)==SQLITE_OK);
 puts("SQLite ordinary DB/FTS5/session roundtrip/upstream apply_v2+concat regressions: PASS");return 0;
}
